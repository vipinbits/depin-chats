import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Cluster = {
  clusterId: string
  templateId: string
  minDevices: number
  maxDevices: number
  connectedDevices: number
  status: string
}

type Model = {
  id: string
  name: string
}

export default function AssignModel() {
  const navigate = useNavigate()
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [selectedClusterId, setSelectedClusterId] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [clustersRes, modelsRes] = await Promise.all([
          fetch('https://dev-api-depin.bitscrunch.com/api/v1/cluster/list?offset=0&limit=50'),
          fetch('https://dev-api-depin.bitscrunch.com/api/v1/model/list?offset=0&limit=100'),
        ])
        if (!clustersRes.ok) throw new Error(`Clusters HTTP ${clustersRes.status}`)
        if (!modelsRes.ok) throw new Error(`Models HTTP ${modelsRes.status}`)
        const clustersJson = await clustersRes.json()
        const modelsJson = await modelsRes.json()
        if (!cancelled) {
          const allClusters: Cluster[] = (clustersJson?.data ?? [])
          const readyClusters = allClusters.filter((c: any) => String(c?.status ?? '').toLowerCase() === 'ready')
          setClusters(readyClusters)

          const modelsArray = Array.isArray(modelsJson) ? modelsJson : (modelsJson?.data ?? [])
          setModels(modelsArray.map((m: any) => ({ id: m.modelId ?? m.id ?? m.name, name: m.name ?? m.modelName ?? String(m.modelId ?? m.id) })))
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const canSubmit = useMemo(() => !!selectedClusterId && !!selectedModelId && !submitting, [selectedClusterId, selectedModelId, submitting])

  async function onAssign() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      // Placeholder assign call; replace with real endpoint if available
      const res = await fetch('https://dev-api-depin.bitscrunch.com/api/v1/model/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusterId: selectedClusterId, modelId: selectedModelId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // After successful assignment, navigate back to home
      navigate('/')
    } catch (e: any) {
      setError(e?.message ?? 'Assignment failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 48, borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 12px' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: 600 }}>Depin • LLM Chat</Link>
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>Back to chat</Link>
        </div>
      </header>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: 520, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Assign Model</div>

          {loading ? (
            <div style={{ fontSize: 12, color: '#64748b' }}>Loading...</div>
          ) : (
            <>
              {error && (
                <div style={{ marginBottom: 12, fontSize: 12, color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', padding: 8, borderRadius: 8 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Select cluster</label>
                <select
                  value={selectedClusterId}
                  onChange={(e) => setSelectedClusterId(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Choose a cluster</option>
                  {clusters.map(c => (
                    <option key={c.clusterId} value={c.clusterId}>
                      {`Cluster ${c.clusterId.slice(-8)} • ${c.connectedDevices}/${c.maxDevices} devices`}
                    </option>
                  ))}
                </select>

                <label style={{ textAlign: 'left', fontSize: 13, fontWeight: 600, marginTop: 8 }}>Select model</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Choose a model</option>
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    onClick={onAssign}
                    disabled={!canSubmit}
                    style={{
                      background: canSubmit ? '#2563eb' : '#94a3b8',
                      color: '#fff',
                      border: 0,
                      borderRadius: 10,
                      padding: '10px 14px',
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      opacity: canSubmit ? 1 : 0.7,
                    }}
                  >
                    {submitting ? 'Assigning...' : 'Assign model'}
                  </button>

                  <button
                    onClick={() => navigate('/')}
                    style={{
                      background: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '10px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


