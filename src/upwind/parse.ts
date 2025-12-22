
export type Mod = {
  raw: string;
  modKey: string;
  target: { name: string, rel: string | null | undefined } | null | undefined;
};

export type Decl = {
  mods: Mod[];
  name: string;
  value: string[] | null | undefined;
  begin: number;
  end: number;
};

type ParseResult<T> = {
  fail_?: false;
  val_: T;
  begin_: number;
  end_: number;
};

type ParseFailure = {
  fail_: true;
  end_: number;
};

export function parse(src: string): ParseResult<Decl[]> {
  return parseDecls(src, 0);
}

// DECLS
//  := _ head=DECL tail={__ d=DECL}* _
//  | _ $
// __ := '[ \t\n\r]+'
// _ := '[ \t\n\r]*'
function parseDecls(src: string, ix: number): ParseResult<Decl[]> {
  const val: Decl[] = [];
  const begin = matchRe(src, ix, /[\s\t\n\r]*/y)!.end_; // skip spaces
  if (begin === src.length) return { val_: [], begin_: 0, end_: begin };
  ix = begin;

  const mCar = parseDecl(src, ix);
  if (!mCar.fail_)
    val.push(...mCar.val_);
  ix = mCar.end_;

  const reWSp = /[\s\t\n\r]+/y;
  for (;;) {
    const ixSep = matchRe(src, ix, reWSp)?.end_;
    if (ixSep == null) break;
    const mCdr = parseDecl(src, ixSep);
    if (!mCdr.fail_)
      val.push(...mCdr.val_);
    ix = mCdr.end_;
  }
  return { val_: val, begin_: begin, end_: ix };
}

// DECL
//  := mod=MOD '/{' ds=DECLS '}'
//  | mod=MOD '/' decl=DECL
//  | name=NAME v={':' c=VAL}?
function parseDecl(src: string, ix: number): ParseResult<Decl[]> | ParseFailure {
  const begin = ix;

  const mMod = parseMod(src, ix);
  withMod: if (mMod) {
    const { val_: mod, end_: ixMod } = mMod;
    if (src[ixMod] !== "/") break withMod;

    let decls: Decl[];
    if (src[ixMod + 1] === "{") {
      //  := mod=MOD '/{' ds=DECLS '}'
      const mDeclGroup = parseDecls(src, ixMod + 2); // +2 for "/{"
      if (mDeclGroup.fail_ || src[mDeclGroup.end_] !== "}") break withMod;
      ix = mDeclGroup.end_ + 1; // +1 for "}"
      decls = mDeclGroup.val_;
    } else {
      //  | mod=MOD '/' decl=DECL
      const mDecl = parseDecl(src, ixMod + 1); // +1 for "/"
      if (mDecl.fail_) break withMod;
      ix = mDecl.end_;
      decls = mDecl.val_;
    }
    return { val_: decls.map(d => ({ ...d, mods: d.mods.concat(mod) })), begin_: begin, end_: ix };
  }

  //  | name=NAME v={':' c=VAL}?
  const mName = parseName(src, ix);
  if (!mName) return skipToDelim(src, ix);
  ix = mName.end_;

  let value: string[] | undefined;
  if (src[mName.end_] === ":") {
    ++ix;
    const mVal = parseVal(src, ix);
    if (!mVal) return skipToDelim(src, ix);
    ix = mVal.end_;
    value = mVal.val_;
  }
  const end = ix;
  return { val_: [{ mods: [], name: mName.val_, value, begin, end }], begin_: begin, end_: end };
}

function skipToDelim(src: string, ix: number): ParseFailure {
  return { fail_: true, end_: matchRe(src, ix, /[^\s\t\n\r}]*/y)!.end_ };
}

// MOD := v=':*[^/_:\s]+' target={'_' name='[^/:\s~\+]+' rel='[~\+]'?}?
function parseMod(src: string, ix: number): ParseResult<Mod> | null {
  const begin = ix;
  let target: Mod["target"];

  const mMod = matchRe(src, ix, /:*[^/_:\s()]+/y);
  if (!mMod) return mMod;
  ix = mMod.end_;
  const modKey = mMod.val_[0];

  if (src[ix] === "_") {
    const mTargetName = matchRe(src, ix + 1, /[^/:\s~+>]+/y); // +1 for "_"
    if (mTargetName) {
      const mRel = matchRe(src, mTargetName.end_, /[~+>]?/y)!;
      ix = mRel.end_;
      target = { name: mTargetName.val_[0], rel: mRel.val_[0] || null };
    }
  }

  return { val_: { modKey, target, raw: src.slice(begin, ix) }, begin_: begin, end_: ix };
}

// NAME := '-'* head=FRAG tail={'-' f=FRAG}*
// FRAG := '[^-\s:\.]+'
function parseName(src: string, ix: number): ParseResult<string> | null {
  const re = /(?:[^\s:.()])+/y;
  const begin = ix;
  const m = matchRe(src, ix, re);
  if (!m) return m;
  return { val_: m.val_[0], begin_: begin, end_: m.end_ };
}

// VAL := '_*' head={NONUS | QUOTED} tail={'_+' v={NONUS | QUOTED}}* '_*'
function parseVal(src: string, ix: number): ParseResult<string[]> | null {
  const reUSp = /_+/y;
  const begin = ix;
  const val: string[] = [];

  ix = matchRe(src, ix, /_*/y)!.end_;

  const mCar = parseValSegment(src, ix);
  if (!mCar) return mCar;
  val.push(mCar.val_);
  ix = mCar.end_;

  for (;;) {
    const ixSep = matchRe(src, ix, reUSp)?.end_;
    if (ixSep == null) break;
    const mCdr = parseValSegment(src, ixSep);
    if (!mCdr) break;
    val.push(mCdr.val_);
    ix = mCdr.end_;
  }

  ix = matchRe(src, ix, /_*/y)!.end_;

  return { val_: val, begin_: begin, end_: ix };
}

// NONUS := v='(\\_\[^\s_}])+'
// QUOTED := '\'' v='(\\\'|[^\'])*' '\''
function parseValSegment(src: string, ix: number): ParseResult<string> | null {
  const begin = ix;
  const mn = matchRe(src, ix, /(?!')(?:\\_|[^\s_}])+/y);
  if (mn)
    return { val_: mn.val_[0].replace(/\\_/g, "_"), begin_: begin, end_: mn.end_  };
  const mq = matchRe(src, ix, /'((?:\\'|[^'])*)'/y);
  return mq && { val_: mq.val_[1].replace(/\\'/g, "'"), begin_: begin, end_: mq.end_ };
}

function matchRe(src: string, ix: number, re: RegExp): ParseResult<RegExpMatchArray> | null {
  re.lastIndex = ix;
  const m = re.exec(src);
  return m && { val_: m, begin_: ix, end_: re.sticky ? re.lastIndex : m.index + m[0].length };
}

export function rawParseMods(src: string, mods: Mod[], withName = false): [Mod[], string | undefined] {
  let ix = 0;
  let mMod: ParseResult<Mod> | null | undefined;
  while ((mMod = parseMod(src, ix)) && (!withName || src[mMod.end_] === "/")) {
    mods.push(mMod.val_);
    ix = mMod.end_ + 1;
  }
  return [mods, parseName(src, ix)?.val_];
}

export function rawParseVal(src: string | number | null | undefined): string[] {
  if (src == null) return [];
  src = "" + src;
  const reSearchSpecial = / +|['"]|url\(/g;
  const ret: string[] = [];
  let segHead = 0;
  let ix = 0;
  for (;;) {
    const m = matchRe(src, ix, reSearchSpecial);
    if (!m)
      break;
    const head = m.val_[0][0];
    if (head === " ") {
      ret.push(src.slice(segHead, m.end_ - m.val_.length));
      segHead = ix = m.end_;
    } else {
      const reSearchEnd =
        head === "'" ?
          /((?:\\'|[^'])*)'/y :
        head === "\"" ?
          /((?:\\"|[^"])*)"/y :
          /((?:\\\)|[^)])*)\)/y
      const mq = matchRe(src, m.end_, reSearchEnd);
      if (!mq)
        break;
      ix = m.end_;
    }
  }
  ret.push(src.slice(segHead));
  return ret;
}
