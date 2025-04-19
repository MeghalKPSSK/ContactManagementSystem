import { BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import './App.css';
import { useEffect, useState } from 'react';
import Login from './components/Login/Login';
import RegisterUser from './components/RegisterUser/RegisterUser';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <Login />
              )
            }
          />
          <Route
            path="/registerUser"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <RegisterUser />
              )
            }
          />
          {/* <Route
            path="/"
            element={user ? <Home /> : <Navigate to="/login" replace />}
          /> */}
          <Route
            path="*"
            element={
              user ? (<div>404 Not Found</div>) : (
                window.location.pathname === "/registerUser" ? (<RegisterUser />) : (<Navigate to="/login" replace />)
              )
            }
          />
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
