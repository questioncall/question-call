"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && prefersDark);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">Question Hub</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              )}
            </button>
            <Link
              href="/auth/signin"
              className="hidden sm:inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup/student"
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-48 right-[15%] h-[500px] w-[500px] rounded-full bg-indigo-500/[0.06] dark:bg-indigo-400/[0.08] blur-[100px]" />
            <div className="absolute top-[60%] -left-24 h-[400px] w-[400px] rounded-full bg-purple-500/[0.06] dark:bg-purple-400/[0.08] blur-[80px]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-32 md:py-40">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                📚 The Q&A platform for classrooms
              </div>

              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                Where questions find{" "}
                <span className="text-indigo-600 dark:text-indigo-400">answers</span>
              </h1>

              <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-gray-500 dark:text-gray-400 sm:text-lg">
                A simple, focused space for students to ask questions and
                teachers to provide answers. No clutter — just learning.
              </p>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <Link
                  href="/auth/signup/student"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-base font-semibold text-white hover:bg-indigo-700 transition-all sm:w-auto"
                >
                  🎓 Sign up as Student
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </Link>
                <Link
                  href="/auth/signup/teacher"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-7 py-3 text-base font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors sm:w-auto"
                >
                  📖 Sign up as Teacher
                </Link>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline-offset-4 hover:underline sm:hidden"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="mb-14 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                Why Question Hub
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple tools for better learning
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
              {[
                { emoji: "💬", title: "Ask & Answer", desc: "Students post questions, teachers provide clear answers — building a shared knowledge base." },
                { emoji: "👥", title: "Role-based access", desc: "Separate flows for students and teachers so everyone gets the right experience." },
                { emoji: "💡", title: "Learn together", desc: "Upvote the best answers, track discussions, and keep everyone aligned on learning goals." },
              ].map((f, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-7 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/5 sm:p-8"
                >
                  <div className="mb-4 text-2xl">{f.emoji}</div>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-200 dark:border-gray-800">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to start learning?
              </h2>
              <p className="mt-4 text-base text-gray-500 dark:text-gray-400">
                Join Question Hub and connect with your classroom today.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
                <Link
                  href="/auth/signup/student"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 text-base font-semibold text-white hover:bg-indigo-700 transition-colors sm:w-auto"
                >
                  🎓 Student Sign Up
                </Link>
                <Link
                  href="/auth/signup/teacher"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-7 py-3 text-base font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors sm:w-auto"
                >
                  📖 Teacher Sign Up
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Question Hub</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
            <Link href="/auth/signin" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sign in</Link>
            <Link href="/auth/signup/student" className="hover:text-gray-900 dark:hover:text-white transition-colors">Students</Link>
            <Link href="/auth/signup/teacher" className="hover:text-gray-900 dark:hover:text-white transition-colors">Teachers</Link>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Question Hub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
