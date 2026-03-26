import { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import Layout from "./components/Layout";
import AdminUsersPage from "./pages/AdminUsersPage";
import PrivateRoute from "./components/PrivateRoute";
import ContactPage from "./pages/ContactPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardLayout from "./layouts/DashboardLayout";
import IAPage from "./pages/dashboard/IAPage";
import Keywords from "./pages/dashboard/Keywords";
import Overview from "./pages/dashboard/Overview";
import Pages from "./pages/dashboard/Pages";
import Traffic from "./pages/dashboard/Traffic";
import {
  clearTokens,
  getMe,
  getKpis,
  registerUser,
  loginUser,
  loginWithGoogle,
} from "./api";
import { isAuthenticated } from "./utils/authHelper";

const defaultRegister = {
  email: "",
  password: "",
  password2: "",
  first_name: "",
  last_name: "",
};

const defaultLogin = { email: "", password: "" };

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [registerForm, setRegisterForm] = useState(defaultRegister);
  const [loginForm, setLoginForm] = useState(defaultLogin);

  const [profile, setProfile] = useState(null);
  const [dashboardKpis, setDashboardKpis] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      loadDashboardData({ silent: true });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;
    if (location.pathname !== "/login" && location.pathname !== "/register") return;
    navigate("/dashboard", { replace: true });
  }, [location.pathname, navigate]);

  async function loadDashboardData(options = {}) {
    const { silent = false } = options;
    setIsLoading(true);

    try {
      try {
        const me = await getMe();
        setProfile(me);
      } catch (error) {
        setMessageType("error");
        setMessage(formatError(error));

        if (!isAuthenticated()) {
          setProfile(null);
          setDashboardKpis(null);
          navigate("/login");
        }
        return;
      }

      try {
        const kpis = await getKpis();
        setDashboardKpis(kpis);
      } catch (error) {
        setDashboardKpis(null);
        if (!silent) {
          const text = formatError(error);
          const isGoogleSetupMessage =
            text.toLowerCase().includes("google account not connected") ||
            text.toLowerCase().includes("no ga4 property selected") ||
            text.toLowerCase().includes("no search console site selected");
          setMessageType(isGoogleSetupMessage ? "info" : "error");
          setMessage(text);
        }
        return;
      }

      if (!silent) {
        setMessageType("success");
        setMessage("Connecte avec succes.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  async function onLogin(e) {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      await loginUser(loginForm);
      await loadDashboardData({ silent: false });
      setLoginForm(defaultLogin);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessageType("error");
      setMessage(formatError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function onGoogleLogin(idToken) {
    setMessage("");
    setIsLoading(true);

    try {
      await loginWithGoogle(idToken);
      await loadDashboardData({ silent: false });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessageType("error");
      setMessage(formatError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(e) {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    try {
      await registerUser(registerForm);
      setRegisterForm(defaultRegister);
      setMessageType("success");
      setMessage("Inscription reussie. Votre compte sera active par le super user.");
      navigate("/login");
    } catch (error) {
      setMessageType("error");
      setMessage(formatError(error));
    } finally {
      setIsLoading(false);
    }
  }

  function onLogout() {
    clearTokens();
    setProfile(null);
    setDashboardKpis(null);

    setMessageType("info");
    setMessage("Session fermee.");
    navigate("/login");
  }

  const isConnected = Boolean(profile);
  const isSuperuser = Boolean(profile?.is_superuser);

  return (
    <Routes>
      <Route
        element={
          <Layout
            isConnected={isConnected}
            isSuperuser={isSuperuser}
            onLogout={onLogout}
            message={message}
            messageType={messageType}
          />
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPasswordPage />} />
        <Route
          path="/login"
          element={
            <LoginPage
              form={loginForm}
              setForm={setLoginForm}
              onSubmit={onLogin}
              onGoogleLogin={onGoogleLogin}
              googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}
              isLoading={isLoading}
            />
          }
        />
        <Route
          path="/register"
          element={
            <RegisterPage
              form={registerForm}
              setForm={setRegisterForm}
              onSubmit={onRegister}
              onGoogleLogin={onGoogleLogin}
              googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ""}
              isLoading={isLoading}
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardLayout
              profile={profile}
              onLogout={onLogout}
              message={message}
              messageType={messageType}
              isLoading={isLoading}
              kpis={dashboardKpis}
              onRefresh={loadDashboardData}
            />
          </PrivateRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="trafic" element={<Traffic />} />
        <Route path="keywords" element={<Keywords />} />
        <Route path="pages" element={<Pages />} />
        <Route path="ia" element={<IAPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route
        path="/admin-users"
        element={
          <PrivateRoute>
            <AdminUsersPage isSuperuser={isSuperuser} />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function formatError(error) {
  if (!error) return "Erreur inconnue";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || "Erreur technique";

  if (error.detail && typeof error.detail === "string") {
    if (error.detail.toLowerCase().includes("no active account")) {
      return "Email ou mot de passe incorrect, ou compte non active.";
    }
    return error.detail;
  }

  const entries = Object.entries(error);
  if (!entries.length) return "Erreur API. Verifie le backend.";

  return entries
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : JSON.stringify(value)}`)
    .join(" | ");
}
