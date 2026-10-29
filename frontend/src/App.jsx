
import { useEffect, useMemo, useState } from "react";
import {
  Activity, ShieldCheck, ShieldAlert, LayoutDashboard,
  Network, FileText, Settings, Search, Bell, Menu,
  ArrowUpRight, ArrowDownRight, RefreshCw, Download,
  ChevronRight, CircleDot, Zap, LockKeyhole, Clock3,
  CheckCircle2, AlertTriangle, X, ScanSearch
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell
} from "recharts";
import "./App.css";

const API = "http://127.0.0.1:8000";

const fallbackEvents = [
  { id: "DEMO-001", timestamp: new Date().toISOString(), source_ip: "192.0.2.10", event_type: "failed_login", risk_score: 82, severity: "Critical", status: "Investigate", description: "Repeated authentication failures" },
  { id: "DEMO-002", timestamp: new Date(Date.now() - 180000).toISOString(), source_ip: "192.0.2.20", event_type: "successful_login", risk_score: 12, severity: "Low", status: "Normal", description: "Successful login recorded" },
  { id: "DEMO-003", timestamp: new Date(Date.now() - 360000).toISOString(), source_ip: "192.0.2.30", event_type: "port_scan", risk_score: 58, severity: "High", status: "Investigate", description: "Potential port scanning activity" },
];

const chartData = [
  { time: "00:00", threats: 12 },
  { time: "04:00", threats: 18 },
  { time: "08:00", threats: 10 },
  { time: "12:00", threats: 29 },
  { time: "16:00", threats: 21 },
  { time: "20:00", threats: 35 },
  { time: "Now", threats: 24 },
];

const severityColors = {
  Critical: "#fb7185",
  High: "#fb923c",
  Medium: "#facc15",
  Low: "#34d399",
};

function timeAgo(value) {
  const difference = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(difference)) return "Unknown";
  if (difference < 60000) return "Just now";
  if (difference < 3600000) return `${Math.floor(difference / 60000)}m ago`;
  if (difference < 86400000) return `${Math.floor(difference / 3600000)}h ago`;
  return new Date(value).toLocaleDateString();
}

function downloadReport(events) {
  const report = {
    product: "CYBERSHIELD AI",
    generated_at: new Date().toISOString(),
    note: "Includes demo data and rule-based risk scores where applicable.",
    events,
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "cybershield-security-report.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [events, setEvents] = useState(fallbackEvents);
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [form, setForm] = useState({
    source_ip: "",
    event_type: "failed_login",
    failed_attempts: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const [eventsResponse, statsResponse] = await Promise.all([
        fetch(`${API}/api/events`),
        fetch(`${API}/api/stats`),
      ]);

      if (!eventsResponse.ok || !statsResponse.ok) {
        throw new Error("Backend unavailable");
      }

      const eventData = await eventsResponse.json();
      const statsData = await statsResponse.json();

      setEvents(eventData.events || []);
      setStats(statsData);
      setConnected(true);
    } catch {
      setConnected(false);
      setStats(null);
      setEvents((current) =>
        current.length ? current : fallbackEvents
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch = [
        event.id,
        event.source_ip,
        event.event_type,
        event.description,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search.toLowerCase())
      );

      const matchesSeverity =
        severityFilter === "All" || event.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [events, search, severityFilter]);

  const criticalCount = events.filter(
    (event) => event.risk_score >= 75
  ).length;

  const highCount = events.filter(
    (event) => event.risk_score >= 50 && event.risk_score < 75
  ).length;

  const mediumCount = events.filter(
    (event) => event.risk_score >= 25 && event.risk_score < 50
  ).length;

  const lowCount = events.filter(
    (event) => event.risk_score < 25
  ).length;

  const averageRisk = events.length
    ? Math.round(
        events.reduce((sum, event) => sum + event.risk_score, 0) /
          events.length
      )
    : 0;

  const pieData = [
    { name: "Critical", value: criticalCount, color: severityColors.Critical },
    { name: "High", value: highCount, color: severityColors.High },
    { name: "Medium", value: mediumCount, color: severityColors.Medium },
    { name: "Low", value: lowCount, color: severityColors.Low },
  ];

  async function analyzeEvent(e) {
    e.preventDefault();
    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          failed_attempts: Number(form.failed_attempts),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Analysis failed");
      }

      setNotice(`Event analyzed successfully: ${data.severity} risk.`);
      setShowAnalyzer(false);
      setForm({
        source_ip: "",
        event_type: "failed_login",
        failed_attempts: 5,
      });
      await loadData();
      setSelectedEvent(data);
    } catch (error) {
      setNotice(
        connected
          ? error.message
          : "Backend is offline. Start FastAPI on port 8000 and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const navigation = [
    { name: "Overview", icon: LayoutDashboard },
    { name: "Threat Events", icon: ShieldAlert },
    { name: "Attack Timeline", icon: Activity },
    { name: "Incident Reports", icon: FileText },
  ];

  function changePage(name) {
    setActivePage(name);
    setMobileMenu(false);
    setNotice("");
  }

  function exportCsv() {
    const columns = [
      "id", "timestamp", "source_ip", "event_type",
      "risk_score", "severity", "status", "description",
    ];

    const escapeCsv = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      columns.join(","),
      ...filteredEvents.map((event) =>
        columns.map((key) => escapeCsv(event[key])).join(",")
      ),
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" })
    );

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cybershield-events.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h2>CYBERSHIELD<span> AI</span></h2>
            <p>THREAT INTELLIGENCE</p>
          </div>
          <button
            className="icon-button mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="nav-list">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${activePage === name ? "active" : ""}`}
              onClick={() => changePage(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Threat Events" && events.length > 0 && (
                <span className="nav-count">{events.length}</span>
              )}
              {activePage === name && (
                <ChevronRight size={15} className="nav-arrow" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-divider" />
        <div className="workspace-label">SYSTEM</div>

        <button
          className={`nav-item ${activePage === "Network Monitor" ? "active" : ""}`}
          onClick={() => changePage("Network Monitor")}
        >
          <Network size={18} />
          <span>Network Monitor</span>
        </button>
        <button
          className={`nav-item ${activePage === "Settings" ? "active" : ""}`}
          onClick={() => changePage("Settings")}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <div className="sidebar-bottom">
          <div className="protection-card">
            <div className="protection-icon"><LockKeyhole size={18} /></div>
            <div>
              <strong>Protection status</strong>
              <p>{connected ? "API connected" : "Demo / offline mode"}</p>
            </div>
            <span className={`status-dot ${connected ? "online" : ""}`} />
          </div>
          <div className="profile">
            <div className="avatar">CS</div>
            <div className="profile-info">
              <strong>Security Analyst</strong>
              <span>Local workspace</span>
            </div>
            <CircleDot size={15} className="profile-status" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-trigger"
              aria-label="Open menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={14} />
              <strong>{activePage}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <div className={`connection-pill ${connected ? "connected" : ""}`}>
              <span className="status-dot" />
              {connected ? "API Connected" : "Demo Mode"}
            </div>
            <button
              className="icon-button"
              title="Refresh data"
              onClick={loadData}
            >
              <RefreshCw size={17} className={loading ? "spin" : ""} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() =>
                setNotice(
                  `${criticalCount} critical and ${highCount} high-risk events in the current event list.`
                )
              }
            >
              <Bell size={18} />
              {criticalCount > 0 && <span className="notification-dot" />}
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><Zap size={13} /> SECURITY OPERATIONS CENTER</div>
              <h1>
                {activePage === "Overview" && <>Threat <span>Overview</span></>}
                {activePage === "Threat Events" && <>Threat <span>Events</span></>}
                {activePage === "Attack Timeline" && <>Attack <span>Timeline</span></>}
                {activePage === "Incident Reports" && <>Incident <span>Reports</span></>}
                {activePage === "Network Monitor" && <>Network <span>Monitor</span></>}
                {activePage === "Settings" && <>Workspace <span>Settings</span></>}
              </h1>
              <p className="welcome-subtitle">
                Monitor security events, investigate suspicious activity, and assess risk.
              </p>
            </div>

            <div className="welcome-actions">
              <button className="btn-secondary" onClick={exportCsv}>
                <Download size={16} /> Export CSV
              </button>
              <button className="btn-primary" onClick={() => setShowAnalyzer(true)}>
                <ScanSearch size={16} /> Analyze Event
              </button>
            </div>
          </section>

          {notice && (
            <div className="notice-banner">
              <Activity size={17} />
              <span>{notice}</span>
              <button className="icon-button" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}

          {!connected && (
            <div className="demo-banner">
              <AlertTriangle size={17} />
              <span>
                <strong>Demo mode:</strong> Showing sample events. Start your FastAPI backend to analyze and load real uploaded log data.
              </span>
            </div>
          )}

          {activePage === "Settings" ? (
            <section className="panel settings-panel">
              <div className="section-heading">
                <div>
                  <h3>Workspace settings</h3>
                  <p>Connection details for your local development environment.</p>
                </div>
              </div>
              <div className="setting-row">
                <div><strong>Backend API</strong><p>{API}</p></div>
                <span className={`severity-badge ${connected ? "low" : "medium"}`}>{connected ? "Connected" : "Offline"}</span>
              </div>
              <div className="setting-row">
                <div><strong>Data refresh</strong><p>Automatically checks the API every 15 seconds.</p></div>
                <button className="btn-secondary" onClick={loadData}>Refresh now</button>
              </div>
              <div className="setting-row">
                <div><strong>Risk scoring</strong><p>The current backend uses demo rules, not a trained ML model.</p></div>
                <span className="severity-badge medium">Rule-based</span>
              </div>
            </section>
          ) : activePage === "Network Monitor" ? (
            <section className="panel empty-panel">
              <Network size={38} />
              <h3>Network monitoring workspace</h3>
              <p>This view is ready for future network-flow integration. Current events come from the local API.</p>
              <button className="btn-primary" onClick={() => changePage("Threat Events")}>View threat events</button>
            </section>
          ) : activePage === "Incident Reports" ? (
            <section className="panel">
              <div className="section-heading">
                <div><h3>Incident report center</h3><p>Export event evidence for review and documentation.</p></div>
                <button className="btn-primary" onClick={() => downloadReport(filteredEvents)}><Download size={16}/> Generate JSON report</button>
              </div>
              <div className="report-summary">
                <FileText size={27}/>
                <div><strong>{filteredEvents.length} events included</strong><p>Report includes event IDs, timestamps, source IPs, risk scores, and descriptions.</p></div>
              </div>
              <EventTable events={filteredEvents} onSelect={setSelectedEvent}/>
            </section>
          ) : (
            <>
              <section className="metrics-grid">
                <MetricCard
                  title="Total Security Events"
                  value={stats?.total_events ?? events.length}
                  subtitle="Events in current dataset"
                  icon={Activity}
                  tone="purple"
                />
                <MetricCard
                  title="Critical Threats"
                  value={stats?.critical_events ?? criticalCount}
                  subtitle="Risk score 75–100"
                  icon={ShieldAlert}
                  tone="red"
                />
                <MetricCard
                  title="High-Risk Events"
                  value={stats?.high_risk_events ?? criticalCount + highCount}
                  subtitle="Risk score 50–100"
                  icon={AlertTriangle}
                  tone="orange"
                />
                <MetricCard
                  title="Average Risk Score"
                  value={`${stats?.average_risk ?? averageRisk}%`}
                  subtitle="Across current events"
                  icon={Zap}
                  tone="green"
                />
              </section>

              {activePage === "Overview" && (
                <section className="analytics-grid">
                  <div className="panel trend-panel">
                    <div className="section-heading">
                      <div>
                        <h3>Threat activity</h3>
                        <p>Illustrative activity trend · last 24 hours</p>
                      </div>
                      <span className="live-tag"><span /> ACTIVITY</span>
                    </div>
                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#9b7bff" stopOpacity={0.35}/>
                              <stop offset="95%" stopColor="#9b7bff" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#25283a" strokeDasharray="4 5" vertical={false}/>
                          <XAxis dataKey="time" tick={{ fill: "#81869d", fontSize: 11 }} axisLine={false} tickLine={false} dy={10}/>
                          <YAxis tick={{ fill: "#81869d", fontSize: 11 }} axisLine={false} tickLine={false}/>
                          <Tooltip contentStyle={{ background: "#171927", border: "1px solid #34364a", borderRadius: 10, color: "#fff" }}/>
                          <Area type="monotone" dataKey="threats" name="Illustrative activity" stroke="#a78bfa" strokeWidth={2.5} fill="url(#threatGradient)" activeDot={{ r: 5, fill: "#c4b5fd" }}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="chart-footnote"><CircleDot size={12}/> Illustrative chart data, not live network telemetry.</div>
                  </div>

                  <div className="panel distribution-panel">
                    <div className="section-heading">
                      <div><h3>Risk distribution</h3><p>Based on current events</p></div>
                    </div>
                    <div className="donut-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={89} paddingAngle={4} stroke="none">
                            {pieData.map((entry) => <Cell key={entry.name} fill={entry.color}/>)}
                          </Pie>
                          <Tooltip contentStyle={{ background: "#171927", border: "1px solid #34364a", borderRadius: 10, color: "#fff" }}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-center"><strong>{events.length}</strong><span>EVENTS</span></div>
                    </div>
                    <div className="legend-list">
                      {pieData.map((item) => (
                        <div className="legend-row" key={item.name}>
                          <span className="legend-label"><span style={{ background: item.color }}/> {item.name}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="panel events-panel">
                <div className="section-heading event-heading">
                  <div>
                    <h3>{activePage === "Attack Timeline" ? "Attack timeline" : "Recent security events"}</h3>
                    <p>Inspect detected events and review their risk scores.</p>
                  </div>
                  <button className="text-button" onClick={() => changePage(activePage === "Threat Events" ? "Overview" : "Threat Events")}>
                    {activePage === "Threat Events" ? "Back to overview" : "View all events"} <ArrowUpRight size={15}/>
                  </button>
                </div>

                <div className="table-toolbar">
                  <div className="search-box">
                    <Search size={16}/>
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search IP, event type, or ID..."
                    />
                    {search && <button className="clear-search" onClick={() => setSearch("")}><X size={14}/></button>}
                  </div>
                  <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                    <option value="All">All severities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {activePage === "Attack Timeline" ? (
                  <div className="timeline">
                    {filteredEvents.map((event) => (
                      <button className="timeline-item" key={event.id} onClick={() => setSelectedEvent(event)}>
                        <div className="timeline-track"><span style={{ background: severityColors[event.severity] || "#a78bfa" }}/></div>
                        <div className="timeline-content">
                          <div className="timeline-top"><strong>{event.event_type.replaceAll("_", " ")}</strong><span>{timeAgo(event.timestamp)}</span></div>
                          <p>{event.description}</p>
                          <div className="timeline-meta"><code>{event.source_ip}</code><SeverityBadge severity={event.severity}/></div>
                        </div>
                        <ChevronRight size={16}/>
                      </button>
                    ))}
                    {!filteredEvents.length && <div className="empty-state">No events match your filters.</div>}
                  </div>
                ) : (
                  <EventTable events={activePage === "Overview" ? filteredEvents.slice(0, 6) : filteredEvents} onSelect={setSelectedEvent}/>
                )}

                <div className="table-footer">
                  <span>Showing {filteredEvents.length ? (activePage === "Overview" ? Math.min(6, filteredEvents.length) : filteredEvents.length) : 0} of {filteredEvents.length} matching events</span>
                  <span className="footer-secure"><LockKeyhole size={12}/> Local workspace</span>
                </div>
              </section>
            </>
          )}

          <footer className="page-footer">
            <span>CYBERSHIELD AI <span className="footer-version">v1.0.0</span></span>
            <span>Built for security investigation · Demo environment</span>
          </footer>
        </div>
      </main>

      {showAnalyzer && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowAnalyzer(false)}>
          <div className="modal">
            <div className="modal-heading">
              <div><div className="modal-icon"><ScanSearch size={21}/></div><h2>Analyze security event</h2></div>
              <button className="icon-button" onClick={() => setShowAnalyzer(false)}><X size={19}/></button>
            </div>
            <p className="modal-description">Submit an event for rule-based risk assessment by the FastAPI backend.</p>
            <form onSubmit={analyzeEvent}>
              <label>Source IP address<input required value={form.source_ip} onChange={(e) => setForm({ ...form, source_ip: e.target.value.trim() })} placeholder="e.g. 192.0.2.40"/></label>
              <label>Event type
                <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                  <option value="failed_login">Failed login</option>
                  <option value="successful_login">Successful login</option>
                  <option value="port_scan">Port scan</option>
                  <option value="suspicious_download">Suspicious download</option>
                  <option value="privilege_change">Privilege change</option>
                </select>
              </label>
              <label>Failed attempts
                <input type="number" min="0" max="10000" required value={form.failed_attempts} onChange={(e) => setForm({ ...form, failed_attempts: e.target.value })}/>
              </label>
              <div className="modal-note"><AlertTriangle size={15}/> Risk scores are heuristic and are not a substitute for security investigation.</div>
              <button className="btn-primary modal-submit" type="submit" disabled={submitting}>
                <ScanSearch size={16}/> {submitting ? "Analyzing..." : "Analyze event"}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelectedEvent(null)}>
          <div className="modal detail-modal">
            <div className="modal-heading">
              <div><div className="modal-icon"><ShieldAlert size={21}/></div><h2>Event investigation</h2></div>
              <button className="icon-button" onClick={() => setSelectedEvent(null)}><X size={19}/></button>
            </div>
            <div className="detail-risk">
              <div><span>RISK SCORE</span><strong>{selectedEvent.risk_score}<small>/100</small></strong></div>
              <SeverityBadge severity={selectedEvent.severity}/>
            </div>
            <div className="detail-grid">
              <div><span>Event ID</span><strong>{selectedEvent.id}</strong></div>
              <div><span>Source IP</span><strong>{selectedEvent.source_ip}</strong></div>
              <div><span>Event type</span><strong>{selectedEvent.event_type.replaceAll("_", " ")}</strong></div>
              <div><span>Timestamp</span><strong>{new Date(selectedEvent.timestamp).toLocaleString()}</strong></div>
              <div><span>Status</span><strong>{selectedEvent.status}</strong></div>
              <div><span>Failed attempts</span><strong>{selectedEvent.failed_attempts ?? "Not recorded"}</strong></div>
            </div>
            <div className="investigation-note">
              <h4><Activity size={15}/> Analysis summary</h4>
              <p>{selectedEvent.description || "No additional description is available."}</p>
              <p className="detail-caution">Verify the original logs, account activity, and surrounding events before taking action. This score alone does not confirm an attack.</p>
            </div>
            <button className="btn-secondary full-width" onClick={() => { downloadReport([selectedEvent]); setSelectedEvent(null); }}><Download size={16}/> Export event report</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, tone }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <div className={`metric-icon ${tone}`}><Icon size={19}/></div>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-bottom">
        <span className="metric-subtitle">{subtitle}</span>
        <span className="metric-indicator"><ArrowUpRight size={14}/></span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }) {
  return (
    <span className={`severity-badge ${(severity || "low").toLowerCase()}`}>
      <span/> {severity || "Unknown"}
    </span>
  );
}

function EventTable({ events, onSelect }) {
  if (!events.length) {
    return <div className="empty-state"><CheckCircle2 size={24}/><strong>No matching events</strong><p>Try changing your search or severity filter.</p></div>;
  }

  return (
    <div className="table-scroll">
      <table className="events-table">
        <thead>
          <tr>
            <th>EVENT</th><th>SOURCE IP</th><th>SEVERITY</th><th>RISK SCORE</th><th>TIME</th><th></th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} onClick={() => onSelect(event)}>
              <td><div className="event-name"><span className={`event-type-icon ${(event.severity || "low").toLowerCase()}`}><ShieldAlert size={16}/></span><div><strong>{event.event_type.replaceAll("_", " ")}</strong><span>{event.id}</span></div></div></td>
              <td><code className="ip-code">{event.source_ip}</code></td>
              <td><SeverityBadge severity={event.severity}/></td>
              <td><div className="risk-cell"><div className="risk-track"><span style={{ width: `${event.risk_score}%`, background: severityColors[event.severity] || "#a78bfa" }}/></div><strong>{event.risk_score}</strong></div></td>
              <td className="time-cell"><Clock3 size={13}/>{timeAgo(event.timestamp)}</td>
              <td><button className="row-action" aria-label="Inspect event" onClick={(e) => { e.stopPropagation(); onSelect(event); }}><ChevronRight size={16}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
