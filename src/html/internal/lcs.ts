/**
 * A range from ix to successiveEnd (inclusive).
 *
 * This implementation caluclates the LCS on ranges but not individual indices. 
 * Since in many case we need the LCS of two sequences that are almost same,
 * such as "before" and "after" adding/removing just one element, this approach
 * reduces the cost in average.
 */
type SuccessiveRange = {
  ix: number;
  successiveEnd: number;
};

type LCSNode = {
  end: SuccessiveRange;
  prev: LCSNode | null;
};

/**
 * Calculate the longest commons subsequence (LCS).
 *
 * LIMITATION: this function only works if **no duplicated elements** in
 * both sequences. Instead, this is probably faster than the widely known
 * algorithm using dynamic programing (O(MN)) since this seems O(M log M),
 * where M and N are the length of both sequence and M >= N. 
 */
export function lcs<T>(xs: T[], ys: T[]): T[] {
  const xIxs = new Map<T, number>();
  const commonIxs: SuccessiveRange[] = [];
  for (let i = 0, len = xs.length; i < len; ++i)
    xIxs.set(xs[i], i);
  for (let i = 0, last = -1, len = ys.length; i < len; ++i) {
    const yi = xIxs.get(ys[i]);
    if (yi == null) continue;
    if (last >= 0 && yi === commonIxs[last].successiveEnd + 1) {
      ++commonIxs[last].successiveEnd;
      continue;
    }
    commonIxs.push({ ix: yi, successiveEnd: yi });
    ++last;
  }

  const ends: LCSNode[] = [{ end: { ix: -1, successiveEnd: -1 }, prev: null }];
  for (let i = 0, len = commonIxs.length; i < len; ++i) {
    const cur = commonIxs[i];
    const curIx = cur.ix;
    const last = ends[ends.length - 1];
    if (last.end.ix < curIx) {
      ends.push({ end: cur, prev: last });
      continue;
    }

    let before = 0;
    let after = ends.length - 1;
    while (after - before > 1) {
      const mid = ((after + before) >> 1) | 0;
      if (ends[mid].end.ix < curIx) {
        if (curIx < ends[mid + 1].end.ix) {
          break;
        }
        before = mid + 1;
      } else {
        after = mid;
      }
    }
    const mid = ((after + before) >> 1) | 0;
    ends[mid + 1] = { end: cur, prev: ends[mid] };
  }

  const longestRev: SuccessiveRange[] = [];
  for (let n: LCSNode = ends[ends.length - 1]; n.prev != null; n = n.prev)
    longestRev.push(n.end);

  const ret: T[] = [];
  for (let i = longestRev.length - 1; i >= 0; --i) {
    const r = longestRev[i];
    for (let j = r.ix; j <= r.successiveEnd; ++j)
      ret.push(xs[j]);
  }
  return ret;
}
