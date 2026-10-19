import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/store/auth";
import { login } from "@/api/auth/authApi";
import { useInitStore } from "@/store/init";

import Spinner from "@/components/additonal/Spinner";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/utils/notification";

// Clear, user-facing message for a failed post-login (init) load.
const getInitErrorMessage = (error) => {
  // No response at all: server down or no internet
  if (!error?.response) {
    return "We couldn't reach the server to load your data. Please check your connection and sign in again.";
  }

  const status = error.response.status;

  if (status === 401 || status === 403) {
    return "Your session couldn't be verified. Please sign in again.";
  }

  return "We signed you in but couldn't load your workspace data. Please try signing in again.";
};

function Login() {
  const navigate = useNavigate();

  const setAuth = useAuthStore((state) => state.setAuth);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);
  const logout = useAuthStore((state) => state.logout);
  const fetchInit = useInitStore((state) => state.fetchInit);
  const resetInit = useInitStore((state) => state.reset);

  // True while the init data is loading after a successful sign in
  const [isInitLoading, setIsInitLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Prevent duplicate requests
    if (isLoading || isInitLoading) {
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const response = await login(email.trim(), password);

      const data = response.data?.data;

      if (!data?.accessToken || !data?.refreshToken || !data?.user) {
        throw new Error("Invalid login response");
      }
      // Persist authentication state (the init request needs the token)
      setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        branch: data.branch ?? null,
      });

      // Credentials are valid: load the init data while the spinner shows
      setIsInitLoading(true);

      try {
        await fetchInit();
      } catch (initError) {
        console.error("Init load error:", initError);

        // Don't keep a half-finished session: clear it and go back to login
        logout();
        resetInit();
        setIsInitLoading(false);

        const initMessage = getInitErrorMessage(initError);

        notifyError(initMessage);
        setErrorMessage(initMessage);

        navigate("/login", { replace: true });

        return;
      }

      // Everything loaded: hide the spinner and enter the app
      setIsInitLoading(false);

      notifySuccess(`Welcome back, ${data.user.fullName}!`);

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error("Login error:", error);

      const message =
        error.response?.data?.message ||
        "Unable to sign in. Please check your credentials.";
      notifyError(message);
      setErrorMessage(message);

      // Make sure loading stops on error
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      {isInitLoading && <Spinner message="Loading your workspace..." />}

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>

          <CardDescription>Sign in to manage your gym.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label required htmlFor="email">
                Email
              </Label>

              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading || isInitLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label required htmlFor="password">Password</Label>

              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isLoading || isInitLoading}
                required
              />
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || isInitLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
