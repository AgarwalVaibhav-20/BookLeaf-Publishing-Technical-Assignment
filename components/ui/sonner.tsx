"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      richColors
      closeButton
      duration={3500}
      icons={{
        success: (
          <CircleCheckIcon className="size-4 text-emerald-600" />
        ),
        info: (
          <InfoIcon className="size-4 text-blue-600" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 text-amber-600" />
        ),
        error: (
          <OctagonXIcon className="size-4 text-red-600" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin text-[#e76577]" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast font-sans border shadow-md rounded-xl p-4 bg-white text-gray-900 border-gray-200 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-800",
          title: "text-sm font-bold text-gray-900 dark:text-gray-100",
          description:
            "!text-gray-700 dark:!text-gray-200 text-xs font-medium mt-0.5 leading-relaxed opacity-100",
          actionButton:
            "bg-[#e76577] text-white text-xs font-semibold px-3 py-1.5 rounded-lg",
          cancelButton:
            "bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
