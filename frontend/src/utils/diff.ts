export type DiffLine = {
  type: 'add' | 'del' | 'context'
  value: string
}

export const diffLines = (original: string, modified: string): DiffLine[] => {
  const a = original.split('\n')
  const b = modified.split('\n')
  const n = a.length
  const m = b.length

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const result: DiffLine[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: 'context', value: a[i - 1] })
      i -= 1
      j -= 1
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'add', value: b[j - 1] })
      j -= 1
    } else if (i > 0) {
      result.push({ type: 'del', value: a[i - 1] })
      i -= 1
    }
  }

  result.reverse()
  return result
}
