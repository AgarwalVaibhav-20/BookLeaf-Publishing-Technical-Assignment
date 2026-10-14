import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Sign Up</h1>
        <p className="mt-2 text-sm text-gray-500">
          Account registration is currently managed by administrators.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-[#e76577] hover:underline"
        >
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
