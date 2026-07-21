import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRequestOtp, useVerifyOtp } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { GraduationCap, ArrowRight, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const phoneSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+233[0-9]{9}$/, "Must be a valid Ghana phone number starting with +233"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export default function Login() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();

  const requestOtpMutation = useRequestOtp();
  const verifyOtpMutation = useVerifyOtp();

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: "+233241234567", // Placeholder demo value
    },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "123456", // Demo value
    },
  });

  function onPhoneSubmit(data: z.infer<typeof phoneSchema>) {
    requestOtpMutation.mutate(
      { data: { phone: data.phone } },
      {
        onSuccess: () => {
          setPhone(data.phone);
          setStep("otp");
          toast.success("OTP sent to your phone");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to send OTP");
        },
      }
    );
  }

  function onOtpSubmit(data: z.infer<typeof otpSchema>) {
    verifyOtpMutation.mutate(
      { data: { phone, otp: data.otp } },
      {
        onSuccess: (session) => {
          setUser(session.user);
          toast.success(`Welcome back!`);
          setLocation("/");
        },
        onError: (err: any) => {
          toast.error(err.message || "Invalid OTP");
        },
      }
    );
  }

  return (
    <div className="min-h-[100dvh] flex bg-background">
      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary rounded-xl mx-auto flex items-center justify-center text-primary-foreground shadow-lg mb-6">
              <GraduationCap className="h-8 w-8" />
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Welcome to SchoolCore
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The professional management platform for schools in Ghana.
            </p>
          </div>

          <div className="bg-card px-8 py-10 shadow-xl border border-border/50 rounded-2xl">
            {step === "phone" ? (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                  <FormField
                    control={phoneForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <Label className="text-foreground">Phone Number</Label>
                        <FormControl>
                          <Input 
                            placeholder="+233 24 123 4567" 
                            className="h-12 text-lg" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium shadow-sm hover-elevate" 
                    disabled={requestOtpMutation.isPending}
                  >
                    {requestOtpMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Continue <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      Enter the 6-digit code sent to <span className="font-medium text-foreground">{phone}</span>
                    </p>
                  </div>
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem className="flex flex-col items-center justify-center">
                        <FormControl>
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} className="w-12 h-14 text-lg" />
                              <InputOTPSlot index={1} className="w-12 h-14 text-lg" />
                              <InputOTPSlot index={2} className="w-12 h-14 text-lg" />
                              <InputOTPSlot index={3} className="w-12 h-14 text-lg" />
                              <InputOTPSlot index={4} className="w-12 h-14 text-lg" />
                              <InputOTPSlot index={5} className="w-12 h-14 text-lg" />
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium shadow-sm hover-elevate mt-6" 
                    disabled={verifyOtpMutation.isPending}
                  >
                    {verifyOtpMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <div className="text-center mt-4">
                    <Button 
                      variant="link" 
                      className="text-sm text-muted-foreground" 
                      onClick={() => setStep("phone")}
                      type="button"
                    >
                      Change phone number
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </div>
      
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-sidebar items-center justify-center">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        
        <div className="relative z-10 p-12 max-w-lg text-center">
          <h3 className="text-4xl font-bold text-white tracking-tight leading-tight">
            Build the future of education.
          </h3>
          <p className="mt-6 text-lg text-sidebar-foreground/80">
            A comprehensive operating system designed specifically for the unique needs of private institutions in West Africa.
          </p>
        </div>
      </div>
    </div>
  );
}
