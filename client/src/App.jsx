import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';
import { useEffect, useState } from 'react';
import Login from './components/Login/Login';
import RegisterUser from './components/RegisterUser/RegisterUser';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SideBar from './components/SideBar/SideBar';
import Main from './components/Main/Main';
import Header from './components/Header/Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import PageNotFound from './pageNotFound';
import Contacts from './components/Contacts/Contacts';
// import ContactDetails from './components/Contacts/ContactDetails';

// Layout component for authenticated routes
const Layout = () => {
  return (
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
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    }
  }, []);

  // Check for session expiry
  useEffect(() => {
    const checkSession = () => {
      const loggedInUser = localStorage.getItem('user');
      if (!loggedInUser && user) {
        setUser(null);
        toast.error('Session expired. Please login again.'); // Directly show the toast message
      }
      if (loggedInUser && (window.location.pathname === "/login" || window.location.pathname === "/register")) {
        window.location.href = "/home";
      }
    };

    const interval = setInterval(checkSession, 500);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="app-container">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/registerUser" element={user ? <Navigate to="/" replace /> : <RegisterUser />} />
          
          {/* Protected routes using Layout */}
          <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
            <Route path="/" element={<Main />} />
            <Route path="/home" element={<Main />} />
            <Route path="/dashboard" element={<Main />} />
            {/* Separate routes for contacts list and contact details */}
            <Route path="/contacts" element={<Contacts />} />
            {/* <Route path="/contacts/:id" element={<Contacts />} /> */}
            <Route path="/settings" element={<Main />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
      />
    </div>
  );
}

export default App;
