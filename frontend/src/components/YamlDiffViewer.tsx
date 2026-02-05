import React, { useMemo } from 'react'
import { diffLines } from '@/utils/diff'

interface YamlDiffViewerProps {
  original: string
  modified: string
}

const YamlDiffViewer: React.FC<YamlDiffViewerProps> = ({ original, modified }) => {
  const lines = useMemo(() => diffLines(original, modified), [original, modified])

  return (
    <div className="yaml-diff">
      {lines.map((line, idx) => (
        <div key={idx} className={`yaml-diff-line yaml-diff-${line.type}`}>
          <span className="yaml-diff-prefix">
            {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
          </span>
          <span className="yaml-diff-content">{line.value}</span>
        </div>
      ))}
    </div>
  )
}

export default YamlDiffViewer
