import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import { useEffect, useState } from 'react';
import Login from './components/Login/Login';
import RegisterUser from './components/RegisterUser/RegisterUser';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SideBar from './components/SideBar/SideBar';
import Header from './components/Header/Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageNotFound from './pageNotFound';
import Contacts from './components/Contacts/Contacts';
import Profile from './components/Profile/profile';
import Dashboard from './components/Dashboards/Dashboard';
import Dragon from './components/Dragon/Dragon';
import Groups from './components/Groups/Groups';
import GroupDetails from './components/Groups/GroupDetails';
import Notes from './components/Notes/Notes';
import NotesDetail from './components/NotesDetail/NotesDetail';
import Settings from './components/Settings/Settings';
import configService from './services/configService';
import { ThemePreferencesProvider } from './contexts/ThemePreferencesContext';

// Authenticated Layout
const Layout = () => (
  <div className="app-layout">
    <SideBar />
    <div className="content-wrapper">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState<{ uid: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(true);

  const parseStoredUser = () => {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;

    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  };

  // Load config on app initialization
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await configService.loadConfig();
        console.log('Config loaded successfully');
      } catch (error) {
        console.error('Failed to load config:', error);
        toast.error('Failed to load application configuration');
      } finally {
        setConfigLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load user on mount
  useEffect(() => {
    const storedUser = parseStoredUser();
    if (storedUser) setUser(storedUser);
    setLoading(false);
  }, []);

  // Detect login via localStorage and trigger state update
  useEffect(() => {
    const interval = setInterval(() => {
      const storedUser = parseStoredUser();
      if (storedUser && !user) {
        setUser(storedUser); // user just logged in
      } else if (!storedUser && user) {
        setUser(null); // session cleared or logged out
        toast.error('Session expired. Please login again.');
      }
    }, 500);
    return () => clearInterval(interval);
  }, [user]);

  if (loading || configLoading) return <div>Loading...</div>;

  return (
    <div className="app-container">
      <ThemePreferencesProvider userId={user?.uid || null}>
        <BrowserRouter>
          <Routes key={user ? 'auth' : 'guest'}>
          {/* Public routes */}
          <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
          <Route path="/registerUser" element={user ? <Navigate to="/home" replace /> : <RegisterUser />} />

          {/* Protected routes */}
          <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
            <Route index element={<Navigate to="/home" />} />
            <Route path="/dragon" element={<Dragon />} />
            <Route path="/home" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />}>
              <Route path=":id" element={<Contacts />} />
            </Route>
            <Route path="/notes" element={<Notes />} />
            <Route path="/notesDetails/:id" element={<NotesDetail />} />
            <Route path="/notesDetails/" element={<NotesDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/groups" element={<Groups />}>
              <Route path=":id" element={<Groups />} />
            </Route>
            <Route path="/groupDetails/:groupId" element={<GroupDetails />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<PageNotFound />} />
          </Routes>
        </BrowserRouter>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          limit={2}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          draggable
          newestOnTop
          theme="light"
          style={{ zIndex: 9999 }}
        />
      </ThemePreferencesProvider>
    </div>
  );
}

export default App;
