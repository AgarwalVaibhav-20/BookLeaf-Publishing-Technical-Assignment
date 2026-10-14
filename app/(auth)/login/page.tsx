"use client";

import { loginUser } from '@/app/redux/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/app/redux/hooks';
import Image from 'next/image'
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react'

function Login() {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const [form , setForm] = useState({
        email:"",
        password:""
    });
    const {loading , error} = useAppSelector((state)=>state.auth)

    const handleSubmit =async (e:FormEvent<HTMLFormElement>)=>{
        e.preventDefault();
        const result = await dispatch(loginUser(form));
        if (loginUser.fulfilled.match(result)) {
            router.replace(result.payload.role === "author" ? "/author/dashboard" : "/admin/dashboard");
        }
    }
    return (
        <main className='flex min-h-0 items-center justify-center bg-slate-50 px-4 py-10'
        >
            <div className='w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
                <div className='mb-8 justify-center flex'>
                    <Image src="/logo.jpg" alt='BookLeaf Publishing' width={100} height={70} property="true" className='h-auto w-40 object-contain' />
                </div>
                {/* Heading */}
                <div className='mb-7'>
                    <h1 className='text-2xl font-bold tracking-tight text-slate-900'>
                        Welcome Back
                    </h1>
                    <p className='mt-2 text-sm leading-6 text-slate-500'>
                        Sign in to manage your books and support requests.
                    </p>
                </div>
                {/* login form */}
                <form className='space-y-5' onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className='mb-2 block text-sm font-medium text-slate-700'>
                            E-mail
                        </label>
                        <input
                            value={form.email}
                            onChange={(e)=>setForm({ 
                                ...form,
                                email:e.target.value
                            })}
                            type="email"
                            id='email'
                            name='email'
                            autoComplete='email'
                            placeholder='your@email.com'
                            required
                            className='w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#f36378] focus:ring-2 focus:ring-[#f36378]/20'
                        />
                    </div>
                    <div>
                        <div className='mb-2 flex items-center justify-between'>
                            <label htmlFor="password" className='mb-2 block text-sm font-medium text-slate-700'>
                                Password
                            </label>
                            <a className='text-sm font-medium text-pink-600 hover:text-pink-700' href="/forgot-password">
                                forgot password?
                            </a>
                        </div>

                        <input
                            value={form.password}
                            onChange={(e)=>setForm({ 
                                ...form,
                                password:e.target.value
                            })}
                            type="password"
                            id='password'
                            name='password'
                            autoComplete='current-password'
                            placeholder='Enter your password..'
                            required
                            className='w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#f36378] focus:ring-2 focus:ring-[#f36378]/20'
                        />
                    </div>
                    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                    <button disabled={loading} className='w-full rounded-lg bg-[#f36378] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e05367] disabled:cursor-not-allowed disabled:opacity-60' type='submit'>
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                {/* Demo Test Credentials Card */}
                <div className="mt-6 rounded-xl border border-rose-100 bg-[#fff8f9] p-4">
                    <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#e76577]">
                            Demo Accounts (Click to Fill)
                        </span>
                        <span className="rounded-full bg-rose-100/70 px-2 py-0.5 text-[10px] font-semibold text-[#e76577]">
                            Password: password123
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <button
                            type="button"
                            onClick={() =>
                                setForm({
                                    email: "exampple@gmail.com",
                                    password: "password123",
                                })
                            }
                            className="group flex w-full items-center justify-between rounded-lg border border-rose-200/70 bg-white px-3 py-2 text-left text-xs transition hover:border-[#e76577] hover:bg-rose-50/50"
                        >
                            <div>
                                <div className="font-semibold text-slate-800 group-hover:text-[#e76577]">
                                    👑 Admin (Operations)
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                    exampple@gmail.com
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#e76577] opacity-60 transition group-hover:opacity-100">
                                Autofill →
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setForm({
                                    email: "priya.sharma@email.com",
                                    password: "password123",
                                })
                            }
                            className="group flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-left text-xs transition hover:border-[#e76577] hover:bg-rose-50/50"
                        >
                            <div>
                                <div className="font-semibold text-slate-800 group-hover:text-[#e76577]">
                                    ✍️ Author (Priya Sharma)
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                    priya.sharma@email.com
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#e76577] opacity-60 transition group-hover:opacity-100">
                                Autofill →
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setForm({
                                    email: "rohit.kapoor@email.com",
                                    password: "password123",
                                })
                            }
                            className="group flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-left text-xs transition hover:border-[#e76577] hover:bg-rose-50/50"
                        >
                            <div>
                                <div className="font-semibold text-slate-800 group-hover:text-[#e76577]">
                                    ✍️ Author (Rohit Kapoor)
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                    rohit.kapoor@email.com
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#e76577] opacity-60 transition group-hover:opacity-100">
                                Autofill →
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setForm({
                                    email: "arjun.malhotra@email.com",
                                    password: "password123",
                                })
                            }
                            className="group flex w-full items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-left text-xs transition hover:border-[#e76577] hover:bg-rose-50/50"
                        >
                            <div>
                                <div className="font-semibold text-slate-800 group-hover:text-[#e76577]">
                                    ✍️ Author (Arjun Malhotra)
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                    arjun.malhotra@email.com
                                </div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#e76577] opacity-60 transition group-hover:opacity-100">
                                Autofill →
                            </span>
                        </button>
                    </div>
                </div>

                <p className='mt-5 text-center text-xs text-slate-500'>
                    Secure access to your BookLeaf account
                </p>
            </div>
        </main>
    )
}

export default Login