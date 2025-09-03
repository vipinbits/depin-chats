import {  useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios';

type Cluster = { 
  clusterId: string; 
  templateId: string; 
  minDevices: number; 
  maxDevices: number; 
  connectedDevices: number; 
  status: string;
  model?: string
  promptUrl?: string;
  accepting?: boolean;
  devices?: { Active: number, Syncing: number };
};

type Message = { id: string; role: 'user' | 'assistant'; text: string; timestamp: number };

// Store chat histories per cluster
const chatHistories = new Map<string, Message[]>();

function Sidebar({ clusters, activeId, onSelect, loading }: { 
  clusters: Cluster[]; 
  activeId?: string; 
  onSelect: (cluster: Cluster) => void;
  loading: boolean;
}) {
  return (
    <aside style={{ width: 280, background: '#fff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ height: 24, width: 24, borderRadius: 6, background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>bc</div>
        <div style={{ fontWeight: 600 }}>Depin</div>
      </div>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0' }}>
        {/* <button style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>New chat</button> */}
        <Link 
          to="/assign-model" 
          style={{ 
            display: 'block',
            width: '100%', 
            padding: '8px 10px', 
            borderRadius: 8, 
            border: '1px solid #e2e8f0', 
            background: '#fff', 
            cursor: 'pointer', 
            textAlign: 'left', 
            fontSize: 13,
            color: '#0f172a',
            textDecoration: 'none'
          }}
        >
          Assign Model
        </Link>
      </div>
      <div style={{ padding: '6px 12px', color: '#64748b', fontSize: 11 }}>
        {loading ? 'Loading clusters...' : 'Chats'}
      </div>
      <div style={{ padding: 12, overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12 }}>Loading clusters...</div>
        ) : clusters.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#64748b', fontSize: 12 }}>No active clusters</div>
        ) : (
          clusters.map((c) => (
            <button key={c.clusterId} onClick={() => onSelect(c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 10, marginBottom: 8,
                borderRadius: 12, border: '1px solid #e2e8f0', background: activeId === c.clusterId ? '#f1f5f9' : '#fff', cursor: 'pointer'
              }}
            >
              <div style={{ height: 32, width: 32, borderRadius: 8, background: activeId === c.clusterId ? '#2563eb' : '#e2e8f0', color: activeId === c.clusterId ? '#fff' : '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                {c.clusterId.slice(-2).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Cluster {c.clusterId.slice(-8)}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {c.connectedDevices}/{c.maxDevices} devices • {c.status}
                </div>
              </div>
              {c.accepting && (
                <div style={{ fontSize: 10, color: '#059669', background: '#d1fae5', padding: '2px 6px', borderRadius: 4 }}>
                  Ready
                </div>
              )}
            </button>
          ))
        )}
      </div>
      <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid #e2e8f0' }}>
        {(!loading && clusters.length === 0) ? (
          <Link to="/assign-model" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>Assign Model</Link>
        ) : (
          <a href="#" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>Manage clusters</a>
        )}
      </div>
    </aside>
  )
}

function ChatPane({ cluster }: { cluster?: Cluster }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  // Load chat history when cluster changes
  useEffect(() => {
    if (cluster) {
      const history = chatHistories.get(cluster.clusterId) || []
      setMessages(history)
    } else {
      setMessages([])
    }
  }, [cluster?.clusterId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  async function send() {
    console.log("cluster in send", cluster)
    // console.log("text", text)
    const content = input
    if (!cluster || !content) return

    const userMessage: Message = { id: String(Date.now()), role: 'user', text: content, timestamp: Date.now() }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    chatHistories.set(cluster.clusterId, newMessages)
    setInput('')
    setLoading(true)
    console.log("content", content)
    try {
      let url 
      if (!cluster.promptUrl) {
        url = "https://localhost:8080"
      } else {
        url = cluster.promptUrl
      }

      const response = await axios.post(url + '/chat', {
        prompt: content
      }, {
        headers: { "Content-Type": "application/json" }
      })
      console.log("response", response)
      const data = response.data
      console.log("data", data)
      const assistantMessage: Message = { 
        id: String(Date.now() + 1), 
        role: "assistant", 
        text: data.response || data.text || data.result || JSON.stringify(data),
        timestamp: Date.now()
      }
  
      console.log("assistantMessage", assistantMessage)
      
      const updatedMessages = [...newMessages, assistantMessage]
      setMessages(updatedMessages)
      chatHistories.set(cluster.clusterId, updatedMessages)
    } catch (error) {
      console.log("error", error)
      const errorMessage: Message = { 
        id: String(Date.now() + 1), 
        role: 'assistant', 
        text: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now()
      }
      const updatedMessages = [...newMessages, errorMessage]
      setMessages(updatedMessages)
      chatHistories.set(cluster.clusterId, updatedMessages)
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
  console.log("cluster",cluster)

  const header = (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ height: 32, width: 32, borderRadius: 8, background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
        {cluster?.clusterId.slice(-2).toUpperCase() ?? 'CL'}
      </div>
      <div style={{ fontWeight: 600 }}>
        {cluster ? `Cluster ${cluster.clusterId.slice(-8)}` : 'Select a cluster'}
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
      Model: {cluster?.model}
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
        {cluster?.devices?.Active ?? 0} devices active
      </div>
      <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
        {cluster?.devices?.Syncing ?? 0} devices syncing
      </div>
    </div>
  )

  const syncingState = (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Cluster is syncing</div>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
          Please wait while the cluster initializes...
        </div>
        <div style={{ display: 'inline-block', padding: '8px 16px', background: '#f1f5f9', borderRadius: 8, fontSize: 12, color: '#475569' }}>
          {cluster?.connectedDevices}/{cluster?.maxDevices} devices connected
        </div>
      </div>
    </div>
  )

  const empty = (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Where should we begin?</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', background: '#fff', padding: 10, borderRadius: 9999 }}>
          <div style={{ height: 20, width: 20, borderRadius: 999, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</div>
          <input 
            value={input} 
            onChange={e=>setInput(e.target.value)} 
            placeholder="Ask anything" 
            style={{ border: 0, outline: 'none', width: 360 }}
            disabled={!cluster?.accepting}
          />
          <button 
            onClick={()=>send()} 
            disabled={!cluster?.accepting || !input.trim()}
            style={{ 
              border: 0, 
              background: cluster?.accepting ? '#2563eb' : '#94a3b8', 
              color: '#fff', 
              borderRadius: 999, 
              padding: '6px 12px', 
              cursor: cluster?.accepting ? 'pointer' : 'not-allowed',
              opacity: cluster?.accepting ? 1 : 0.6
            }}
          >
            Ask
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#f8fafc' }}>
      {header}
      <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {!cluster ? empty : 
         !cluster.accepting ? syncingState :
         messages.length === 0 ? empty : 
         messages.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', padding: '4px 8px' }}>
            <div style={{ maxWidth: '70%', border: '1px solid #e2e8f0', background: m.role === 'user' ? '#2563eb' : '#fff', color: m.role === 'user' ? '#fff' : '#0f172a', padding: '10px 12px', borderRadius: 12 }}>
              <div>{m.text}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                {new Date(m.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '4px 8px' }}>
            <div style={{ border: '1px solid #e2e8f0', background: '#fff', padding: '10px 12px', borderRadius: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Assistant is typing...</div>
            </div>
          </div>
        )}
      </div>
      {cluster?.accepting && (
        <div style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: 12 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea 
              value={input} 
              onChange={e=>setInput(e.target.value)} 
              onKeyDown={onKeyDown} 
              placeholder="Ask something... (Enter to send)" 
              style={{ flex: 1, borderRadius: 12, border: '1px solid #e2e8f0', padding: 12, resize: 'none', height: 80 }}
              disabled={loading}
            />
            <button 
              onClick={()=>send()} 
              disabled={loading || !input.trim()}
              style={{ 
                background: loading ? '#94a3b8' : '#2563eb', 
                color: '#fff', 
                border: 0, 
                borderRadius: 10, 
                padding: '10px 14px', 
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [activeCluster, setActiveCluster] = useState<Cluster | undefined>()
  const [loading, setLoading] = useState(true)
  const [clusterLoading, setClusterLoading] = useState(false)
  console.log(clusterLoading)
  // Fetch active clusters on mount
  useEffect(() => {
    async function fetchClusters() {
      try {
        const response = await fetch('https://dev-api-depin.bitscrunch.com/api/v1/cluster/list?status=Active&offset=0&limit=20')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        console.log("data", data)
        setClusters(data.data || [])
      } catch (error) {
        console.error('Failed to fetch clusters:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClusters()
  }, [])

  // Fetch cluster details when selected
  async function selectCluster(cluster: Cluster) {
    setClusterLoading(true)
    try {
      const response = await fetch(`https://dev-api-depin.bitscrunch.com/api/v1/cluster/prompt/${cluster.clusterId}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const details = await response.json()
      console.log("details", details)
      const updatedCluster = {
        ...cluster,
        promptUrl: details.promptUrl,
        accepting: details.accepting,
        devices: details.devices,
        model: details.model
      }
      
      setActiveCluster(updatedCluster)
    } catch (error) {
      console.error('Failed to fetch cluster details:', error)
      setActiveCluster(cluster) // Still set the cluster even if details fail
    } finally {
      setClusterLoading(false)
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: 48, borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <div style={{ fontWeight: 600 }}>Depin • LLM Chat</div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>Powered by multi-node clusters</div>
      </header>
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar 
          clusters={clusters} 
          activeId={activeCluster?.clusterId} 
          onSelect={selectCluster}
          loading={loading}
        />
        <ChatPane cluster={activeCluster} />
      </div>
    </div>
  )
}
