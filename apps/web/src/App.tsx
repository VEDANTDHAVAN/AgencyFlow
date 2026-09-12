import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io, type Socket } from "socket.io-client";
import "./index.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

type Role = "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
  client?: {
    id: string;
    name: string;
  };
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string | null;
  projectId: string;
  assignedDeveloper?: {
    id: string;
    name: string;
  } | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

function Login({
  onLogin,
}: {
  onLogin: (token: string, user: User) => void;
}) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email, password,
      });

      console.log("LOGIN RESPONSE:", response.data);

      const result = response.data.data ?? response.data;

      if (!result.accessToken || !result.user) {
        throw new Error("Invalid login response from server");
      }

      onLogin(result.accessToken, result.user);
    } catch (err) {
      console.error("LOGIN ERROR:", err);

      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Unable to sign in",
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to sign in");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand-mark">AF</div>

        <h1>AgencyFlow</h1>
        <p className="muted">
          Real-time agency project management
        </p>

        <form onSubmit={submit}>
          <label>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />

          <label>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />

          {error && <div className="error">{error}</div>}

          <button className="primary full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="demo-account">
          <strong>Demo account</strong>
          <span>admin@example.com</span>
          <span>Password123!</span>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  function handleLogin(newToken: string, newUser: User) {
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    setToken(null);
    setUser(null);
  }

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      token={token}
      user={user}
      onLogout={handleLogout}
    />
  );
}

function Dashboard({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: User;
  onLogout: () => void;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(
    new Set(),
  );

  const client = useMemo(() => {
    const instance = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return instance;
  }, [token]);

  useEffect(() => {
    async function load() {
      try {
        const [projectsResponse, tasksResponse, notificationsResponse, countResponse] =
          await Promise.all([
            client.get("/projects"),
            client.get("/tasks"),
            client.get("/notifications"),
            client.get("/notifications/unread-count"),
          ]);
        
        const projectsData =
        projectsResponse.data.data?.projects ??
        projectsResponse.data.projects ??
        projectsResponse.data.data ?? projectsResponse.data;

        const tasksData =
        tasksResponse.data.data?.tasks ??
        tasksResponse.data.tasks ??
        tasksResponse.data.data ??
        tasksResponse.data;

        setProjects(
          Array.isArray(projectsData) ? projectsData : [],
        );

        setTasks(Array.isArray(tasksData) ? tasksData : [],);

        const notificationsData =
        notificationsResponse.data.data?.notifications ??
        notificationsResponse.data.notifications ??
        notificationsResponse.data.data ?? notificationsResponse.data;

        setNotifications(
          Array.isArray(notificationsData)
          ? notificationsData : [],
        );

        const count =
          countResponse.data.data?.count ??
          countResponse.data.count ??
          0;

        setUnreadCount(count);
      } catch (error) {
        console.error("Dashboard loading failed:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [client]);

  useEffect(() => {
    const socket: Socket = io(API_URL, {
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log("Realtime connected");
    });

    socket.on("task:status-changed", (event) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === event.taskId
            ? {
                ...task,
                status: event.newStatus,
              }
            : task,
        ),
      );
    });

    socket.on("notification:new", (notification) => {
      setNotifications((current) => Array.isArray(current) ? [notification, ...current] : [notification]);
    });

    socket.on("notification:unread-count", ({ count }) => {
      setUnreadCount(count);
    });

    socket.on("presence:changed", ({ userId, online }) => {
      setOnlineUsers((current) => {
        const next = new Set(current);

        if (online) {
          next.add(userId);
        } else {
          next.delete(userId);
        }

        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  async function updateStatus(
    taskId: string,
    status: Task["status"],
  ) {
    try {
      await client.patch(`/tasks/${taskId}/status`, {
        status,
      });

      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? { ...task, status }
            : task,
        ),
      );
    } catch (error) {
      console.error("Status update failed:", error);
    }
  }

  async function markAllRead() {
    try {
      await client.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: new Date().toISOString(),
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Notification update failed:", error);
    }
  }

  async function logout() {
    try {
      await client.post("/auth/logout");
    } finally {
      onLogout();
    }
  }

  const visibleTasks =
    selectedProject === "all"
      ? tasks
      : tasks.filter(
          (task) => task.projectId === selectedProject,
        );

  const stats = {
    projects: projects.length,
    tasks: tasks.length,
    active: tasks.filter(
      (task) => task.status === "IN_PROGRESS",
    ).length,
    overdue: tasks.filter(
      (task) =>
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        task.status !== "DONE",
    ).length,
  };

  if (loading) {
    return (
      <div className="loading-screen">
        Loading AgencyFlow...
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="brand-mark small">AF</div>
          <span>AgencyFlow</span>
        </div>

        <nav>
          <button className="nav-item active">
            <span>▦</span>
            Dashboard
          </button>

          <button className="nav-item">
            <span>◫</span>
            Projects
          </button>

          <button className="nav-item">
            <span>✓</span>
            Tasks
          </button>

          <button className="nav-item">
            <span>◉</span>
            Activity
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="connection">
            <span className="online-dot" />
            Realtime connected
          </div>

          <div className="user-mini">
            <div className="avatar">
              {user.name?.charAt(0) ||
                user.email.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user.name}</strong>
              <span>{user.role.replace("_", " ")}</span>
            </div>
          </div>

          <button className="logout" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>Dashboard</h2>
            <p>
              Welcome back, {user.name || user.email}
            </p>
          </div>

          <div className="top-actions">
            <div className="notification-button">
              🔔
              {unreadCount > 0 && (
                <span>{unreadCount}</span>
              )}
            </div>

            <div className="avatar">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="content">
          <div className="stats-grid">
            <Stat
              label="Projects"
              value={stats.projects}
              icon="◫"
            />
            <Stat
              label="Total Tasks"
              value={stats.tasks}
              icon="✓"
            />
            <Stat
              label="In Progress"
              value={stats.active}
              icon="◌"
            />
            <Stat
              label="Overdue"
              value={stats.overdue}
              icon="!"
              danger
            />
          </div>

          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Projects</h3>
                  <p>Your active projects</p>
                </div>

                <select
                  value={selectedProject}
                  onChange={(e) =>
                    setSelectedProject(e.target.value)
                  }
                >
                  <option value="all">All projects</option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="project-list">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className={`project-card ${
                      selectedProject === project.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedProject(project.id)
                    }
                  >
                    <div className="project-icon">
                      {project.name.charAt(0)}
                    </div>

                    <div>
                      <strong>{project.name}</strong>
                      <span>
                        {project.client?.name ||
                          "Internal project"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h3>Notifications</h3>
                  <p>{unreadCount} unread</p>
                </div>

                {unreadCount > 0 && (
                  <button
                    className="text-button"
                    onClick={markAllRead}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="empty">
                    No notifications
                  </div>
                ) : (
                  notifications.slice(0, 5).map(
                    (notification) => (
                      <div
                        className={`notification ${
                          !notification.readAt
                            ? "unread"
                            : ""
                        }`}
                        key={notification.id}
                      >
                        <div className="notification-icon">
                          🔔
                        </div>

                        <div>
                          <strong>
                            {notification.title}
                          </strong>
                          <p>{notification.message}</p>
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </section>
          </div>

          <section className="panel tasks-panel">
            <div className="panel-header">
              <div>
                <h3>Tasks</h3>
                <p>
                  {visibleTasks.length} tasks in view
                </p>
              </div>
            </div>

            <div className="task-table">
              <div className="task-row task-head">
                <span>Task</span>
                <span>Priority</span>
                <span>Status</span>
                <span>Due date</span>
              </div>

              {visibleTasks.map((task) => (
                <div className="task-row" key={task.id}>
                  <div className="task-name">
                    <strong>{task.title}</strong>
                    {task.assignedDeveloper && (
                      <span>
                        {task.assignedDeveloper.name}
                      </span>
                    )}
                  </div>

                  <span
                    className={`priority ${task.priority.toLowerCase()}`}
                  >
                    {task.priority}
                  </span>

                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateStatus(
                        task.id,
                        e.target.value as Task["status"],
                      )
                    }
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">
                      In Progress
                    </option>
                    <option value="IN_REVIEW">
                      In Review
                    </option>
                    <option value="DONE">Done</option>
                  </select>

                  <span
                    className={
                      task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      task.status !== "DONE"
                        ? "overdue"
                        : ""
                    }
                  >
                    {task.dueDate
                      ? new Date(
                          task.dueDate,
                        ).toLocaleDateString()
                      : "No deadline"}
                  </span>
                </div>
              ))}

              {visibleTasks.length === 0 && (
                <div className="empty">
                  No tasks found.
                </div>
              )}
            </div>
          </section>

          <div className="footer-status">
            <span>
              {onlineUsers.size + 1} users currently online
            </span>

            <span>
              Logged in as {user.email}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: number;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${danger ? "danger" : ""}`}>
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default App;