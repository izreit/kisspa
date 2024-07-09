
export type Mod = {
  modKey: string;
  target: { name: string, rel: string | null } | null;
  begin: number;
  end: number;
};

export type Decl = {
  modifiers: Mod[];
  name: string[];
  value: string[] | null;
  begin: number;
  end: number;
};

type ParseResult<T> = {
  fail?: false;
  val: T;
  begin: number;
  end: number;
};

type ParseFailure = {
  fail: true;
  end: number;
};

export function parse(src: string): ParseResult<Decl[]> {
  return parseDecls(src, 0);
}

// DECLS
//  := _ beginpos=@ head=DECL tail={__ d=DECL}* endpos=@ _
//  | beginpos=@ _ endpos=@ $
// __ := '[ \t\n\r]+'
// _ := '[ \t\n\r]*'
function parseDecls(src: string, ix: number): ParseResult<Decl[]> {
  const val: Decl[] = [];
  const begin = matchRe(src, ix, /[\s\t\n\r]*/y)!.end; // skip spaces
  if (begin === src.length) return { val: [], begin: 0, end: begin };
  ix = begin;

  const mCar = parseDecl(src, ix);
  if (!mCar.fail)
    val.push(...mCar.val);
  ix = mCar.end;

  const reWSp = /[\s\t\n\r]+/y;
  for (;;) {
    const ixSep = matchRe(src, ix, reWSp)?.end;
    if (ixSep == null) break;
    const mCdr = parseDecl(src, ixSep);
    if (!mCdr.fail)
      val.push(...mCdr.val);
    ix = mCdr.end;
  }
  return { val, begin, end: ix };
}

// DECL
//  := mod=MOD '/{' ds=DECLS '}'
//  | mod=MOD '/' decl=DECL
//  | beginpos=@ name=NAME v={':' c=VAL}? endpos=@
function parseDecl(src: string, ix: number): ParseResult<Decl[]> | ParseFailure {
  const begin = ix;

  const mMod = parseMod(src, ix);
  withMod: if (mMod) {
    const { val: mod, end: ixMod } = mMod;
    if (src[ixMod] !== "/") break withMod;

    if (src[ixMod + 1] === "{") {
      //  := mod=MOD '/{' ds=DECLS '}'
      const mDeclGroup = parseDecls(src, ixMod + 2); // +2 for "/{"
      if (mDeclGroup.fail || src[mDeclGroup.end] !== "}") break withMod;
      ix = mDeclGroup.end + 1; // +1 for "}"
      const decls = mDeclGroup.val.map(d => ({ ...d, modifiers: d.modifiers.concat(mod) }));
      return { val: decls, begin, end: ix };

    } else {
      //  | mod=MOD '/' decl=DECL
      const mDecl = parseDecl(src, ixMod + 1); // +1 for "/"
      if (mDecl.fail) break withMod;
      ix = mDecl.end;
      const decls = mDecl.val.map(d => ({ ...d, modifiers: d.modifiers.concat(mod) }));
      return { val: decls, begin, end: ix };
    }
  }

  //  | beginpos=@ name=NAME v={':' c=VAL}? endpos=@
  const mName = parseName(src, ix);
  if (!mName) return skipToDelim(src, ix);
  ix = mName.end;

  let value: string[] | null = null;
  if (src[mName.end] === ":") {
    ++ix;
    const mVal = parseVal(src, ix);
    if (!mVal) return skipToDelim(src, ix);
    ix = mVal.end;
    value = mVal.val;
  }
  const end = ix;
  return { val: [{ modifiers: [], name: mName.val, value, begin, end }], begin, end };
}

function skipToDelim(src: string, ix: number): ParseFailure {
  return { fail: true, end: matchRe(src, ix, /[^\s\t\n\r}]*/y)!.end };
}

// MOD := beginpos=@ v=':*[^/_:\s]+' target={'_' name='[^/:\s~\+]+' rel='[~\+]'?}? endpos=@
function parseMod(src: string, ix: number): ParseResult<Mod> | null {
  const begin = ix;
  let target: Mod["target"] = null;

  const mMod = matchRe(src, ix, /:*[^/_:\s\(\)]+/y);
  if (!mMod) return null;
  ix = mMod.end;
  const modKey = mMod.val[0];

  parseTarget: if (src[ix] === "_") {
    const mTargetName = matchRe(src, ix + 1, /[^/:\s~\+]+/y); // +1 for "_"
    if (!mTargetName) break parseTarget;
    const mRel = matchRe(src, mTargetName.end, /[~\+]?/y)!;
    ix = mRel.end;
    target = { name: mTargetName.val[0], rel: mRel.val[0] || null };
  }

  const end = ix;
  return { val: { modKey, target, begin, end }, begin, end };
}

// NAME := '-'* head=FRAG tail={'-' f=FRAG}*
// FRAG := '[^-\s:\.]+'
function parseName(src: string, ix: number): ParseResult<string[]> | null {
  const reFrag = /[^-\s:\.\(\)]+/y;
  const begin = ix;
  const val: string[] = [];

  const mPrefix = matchRe(src, ix, /-+/y);
  if (mPrefix) {
    val.push(mPrefix.val[0].slice(-1)); // strip the last "-" (since joined by "-" later)
    ix = mPrefix.end;
  }

  const mCar = matchRe(src, ix, reFrag);
  if (!mCar) return null;
  val.push(mCar.val[0]);
  ix = mCar.end;

  for (;;) {
    if (src[ix] !== "-") break;
    ix += 1;
    const mCdr = matchRe(src, ix, reFrag);
    if (!mCdr) {
      val.push(""); // rescure the names ended with "-" (although seems invalid)
      break;
    }
    val.push(mCdr.val[0]);
    ix = mCdr.end;
  }
  return { val, begin, end: ix };
}

// VAL := '_*' head={NONUS | QUOTED} tail={'_+' v={NONUS | QUOTED}}* '_*'
function parseVal(src: string, ix: number): ParseResult<string[]> | null {
  const reUSp = /_+/y;
  const begin = ix;
  const val: string[] = [];

  ix = matchRe(src, ix, /_*/y)!.end;

  const mCar = parseValSegment(src, ix);
  if (!mCar) return null;
  val.push(mCar.val);
  ix = mCar.end;

  for (;;) {
    const ixSep = matchRe(src, ix, reUSp)?.end;
    if (ixSep == null) break;
    const mCdr = parseValSegment(src, ixSep);
    if (!mCdr) break;
    val.push(mCdr.val);
    ix = mCdr.end;
  }

  ix = matchRe(src, ix, /_*/y)!.end;

  return { val, begin, end: ix };
}

// NONUS := v='(\\_\[^\s_}])+'
// QUOTED := '\'' v='(\\\'|[^\'])*' '\''
function parseValSegment(src: string, ix: number): ParseResult<string> | null {
  const begin = ix;
  const mn = matchRe(src, ix, /(?!')(?:\\_|[^\s_\}])+/y);
  if (mn)
    return { val: mn.val[0].replace(/\\_/g, "_"), begin, end: mn.end  };
  const mq = matchRe(src, ix, /'((?:\\'|[^'])*)'/y);
  return mq ? { val: mq.val[1].replace(/\\'/g, "'"), begin, end: mq.end } : null;
}

function matchRe(src: string, ix: number, re: RegExp): ParseResult<RegExpMatchArray> | null {
  const begin = ix;
  re.lastIndex = ix;
  const m = re.exec(src);
  return m ? { val: m, begin, end: ix + m[0].length } : null;
}
