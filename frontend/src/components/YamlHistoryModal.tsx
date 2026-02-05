import React, { useEffect, useMemo, useState } from 'react'
import { Modal, List, Tag, Space, Typography, Button } from 'antd'
import dayjs from 'dayjs'
import YamlDiffViewer from '@/components/YamlDiffViewer'
import type { K8sYamlHistory } from '@/services/k8s'

interface YamlHistoryModalProps {
  open: boolean
  loading: boolean
  items: K8sYamlHistory[]
  current: string
  onClose: () => void
  onRestore: (yaml: string) => void
  onRollback: (yaml: string) => void
}

const YamlHistoryModal: React.FC<YamlHistoryModalProps> = ({
  open,
  loading,
  items,
  current,
  onClose,
  onRestore,
  onRollback,
}) => {
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    if (open && items.length > 0) {
      setSelectedId(items[0].id)
    }
  }, [open, items])

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  )

  return (
    <Modal
      title="历史版本"
      open={open}
      onCancel={onClose}
      width={920}
      footer={(
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button disabled={!selected} onClick={() => selected && onRestore(selected.yaml)}>
            恢复内容
          </Button>
          <Button type="primary" disabled={!selected} onClick={() => selected && onRollback(selected.yaml)}>
            回滚并应用
          </Button>
        </Space>
      )}
    >
      <div className="yaml-history">
        <div className="yaml-history-list">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                onClick={() => setSelectedId(item.id)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: item.id === selectedId ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                }}
              >
                <Space direction="vertical" size={4}>
                  <div style={{ fontWeight: 600 }}>{dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}</div>
                  <div style={{ color: '#64748b' }}>{item.username || '系统'}</div>
                  {item.action && <Tag>{item.action}</Tag>}
                </Space>
              </List.Item>
            )}
          />
        </div>
        <div className="yaml-history-preview">
          {selected ? (
            <>
              <Typography.Text type="secondary">
                当前编辑内容 vs 选中历史版本
              </Typography.Text>
              <YamlDiffViewer original={current} modified={selected.yaml} />
            </>
          ) : (
            <Typography.Text type="secondary">暂无历史版本</Typography.Text>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default YamlHistoryModal
