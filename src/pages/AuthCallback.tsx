import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // The Supabase client listener in AuthProvider handles the hash fragment parsing
    // and session restoration automatically.
    
    // Once the session is established, we redirect.
    if (session) {
      // Default to tester access, or use the 'next' param if present
      // Note: hash params are handled by supabase, query params by router
      const next = searchParams.get("next") || "/tester-access";
      navigate(next);
    }
    
    // Handle error cases passed in URL (e.g. error=access_denied&error_description=...)
    const errorDescription = searchParams.get("error_description");
    if (errorDescription) {
        setError(errorDescription);
    }

  }, [session, navigate, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center text-destructive">
          <h2 className="text-lg font-semibold">Authentication Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Verifying session...</h2>
        <p className="text-muted-foreground">Please wait while we log you in.</p>
      </div>
    </div>
  );
};

export default AuthCallback;
