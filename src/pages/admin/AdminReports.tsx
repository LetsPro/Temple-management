import { useState, useEffect } from 'react'
import { Download, Filter } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Skeleton } from '../../components/ui/Skeleton'

type ReportType = 'bookings' | 'donations' | 'devotees'

const COLORS = ['#A52A2A', '#E76F24', '#F5B942', '#2E7D32', '#1565C0']

export default function AdminReports() {
  const [reportType, setReportType] = useState<ReportType>('donations')
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [data, setData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    loadReport()
  }, [reportType, dateFrom, dateTo])

  const loadReport = async () => {
    setLoading(true)
    if (reportType === 'donations') {
      const { data: donations } = await supabase.from('donations').select('*').gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59')
      const d = donations || []
      const total = d.filter(x => x.payment_status === 'paid' || x.payment_status === 'offline').reduce((s, x) => s + x.amount, 0)
      const byPurpose = d.reduce<Record<string, number>>((acc, x) => { acc[x.purpose] = (acc[x.purpose] || 0) + x.amount; return acc }, {})
      setData(Object.entries(byPurpose).map(([name, amount]) => ({ name, amount })))
      setSummary([
        { label: 'Total Donations', value: `₹${total.toLocaleString('en-IN')}` },
        { label: 'Total Transactions', value: `${d.length}` },
        { label: 'Paid Online', value: `${d.filter(x => x.payment_status === 'paid').length}` },
        { label: 'Offline', value: `${d.filter(x => x.payment_status === 'offline').length}` },
      ])
    } else if (reportType === 'bookings') {
      const { data: bookings } = await supabase.from('bookings').select('*, pooja_services(name)').gte('booking_date', dateFrom).lte('booking_date', dateTo)
      const b = bookings || []
      const revenue = b.filter(x => x.payment_status === 'paid').reduce((s, x) => s + x.total_amount, 0)
      const byService: Record<string, number> = {}
      b.forEach((bk: Record<string, unknown>) => { const svc = (bk.pooja_services as { name: string } | null)?.name || 'Unknown'; byService[svc] = (byService[svc] || 0) + 1 })
      setData(Object.entries(byService).map(([name, count]) => ({ name, count })))
      setSummary([
        { label: 'Total Bookings', value: `${b.length}` },
        { label: 'Revenue Collected', value: `₹${revenue.toLocaleString('en-IN')}` },
        { label: 'Confirmed', value: `${b.filter(x => x.booking_status === 'confirmed').length}` },
        { label: 'Cancelled', value: `${b.filter(x => x.booking_status === 'cancelled').length}` },
      ])
    } else {
      const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'devotee').gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59')
      const p = profiles || []
      const byState: Record<string, number> = {}
      p.forEach(x => { const st = x.state || 'Unknown'; byState[st] = (byState[st] || 0) + 1 })
      setData(Object.entries(byState).map(([name, count]) => ({ name, count })))
      setSummary([
        { label: 'New Registrations', value: `${p.length}` },
        { label: 'Active', value: `${p.filter(x => x.is_active).length}` },
        { label: 'States', value: `${Object.keys(byState).length}` },
      ])
    }
    setLoading(false)
  }

  const exportCSV = () => {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const header = keys.join(',')
    const rows = data.map(row => keys.map(k => row[k]).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${reportType}-report.csv`; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-temple-text">Reports</h1>
          <p className="text-temple-muted text-sm">Analytics and data exports</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm no-print"><Download size={14} /> Export CSV</button>
      </div>

      {/* Filters */}
      <div className="card flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex gap-2">
          {(['donations', 'bookings', 'devotees'] as ReportType[]).map(t => (
            <button key={t} onClick={() => setReportType(t)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${reportType === t ? 'bg-vermilion-700 text-white' : 'bg-cream-100 text-temple-muted hover:text-temple-text'}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-3 sm:ml-auto items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-temple-muted">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm py-1.5 px-3 w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-temple-muted">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm py-1.5 px-3 w-36" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4"><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div><Skeleton className="h-64 rounded-2xl" /></div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {summary.map(s => (
              <div key={s.label} className="card text-center">
                <div className="text-2xl font-bold text-vermilion-700 mb-1">{s.value}</div>
                <div className="text-xs text-temple-muted font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-temple-text mb-4 capitalize">{reportType} by {reportType === 'donations' ? 'Purpose' : reportType === 'bookings' ? 'Service' : 'State'}</h3>
              {data.length === 0 ? (
                <div className="text-center py-8 text-temple-muted text-sm">No data for selected period</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => reportType === 'donations' ? `₹${v.toLocaleString('en-IN')}` : v} />
                    <Bar dataKey={reportType === 'donations' ? 'amount' : 'count'} fill="#E76F24" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {data.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-temple-text mb-4">Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey={reportType === 'donations' ? 'amount' : 'count'} nameKey="name">
                      {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => reportType === 'donations' ? `₹${v.toLocaleString('en-IN')}` : v} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Data table */}
          {data.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="font-bold text-temple-text mb-4">Detail Table</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-temple-border">
                    {Object.keys(data[0]).map(k => <th key={k} className="pb-2 pr-4 text-left text-xs font-semibold text-temple-muted uppercase capitalize">{k}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-temple-border/30">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="py-2 pr-4 text-temple-text">{typeof v === 'number' && reportType === 'donations' ? `₹${v.toLocaleString('en-IN')}` : String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
