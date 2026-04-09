import Link from "next/link";

export default function EsewaFailurePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F9FAFB] dark:bg-[#1C1C1C] gap-4 text-center px-4">
      <div className="flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
        <div className="text-red-500 text-5xl">✗</div>
      </div>
      <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">Payment Unsuccessful</h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm text-[15px] leading-relaxed">
        Your eSewa payment was cancelled or failed. No money has been charged from your account. You can try again anytime.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full max-w-xs">
        <Link
          href="/subscription"
          className="px-6 py-3 bg-[#1B7258] dark:bg-[#27A883] text-white font-semibold rounded-full hover:bg-opacity-90 w-full"
        >
          Try Again
        </Link>
        <Link
          href="/"
          className="px-6 py-3 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 w-full"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
