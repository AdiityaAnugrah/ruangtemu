"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useState } from "react";
import { type FieldErrors, type UseFormRegister, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { authApi, citiesApi, interestsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { BrandLogo } from "@/components/ui/brand-mark";
import { GoogleRedirectButton } from "@/components/auth/GoogleRedirectButton";

const genderValues = ["MALE", "FEMALE", "OTHER"];
const steps = [
  { id: 1, label: "Akun" },
  { id: 2, label: "Profil" },
  { id: 3, label: "Minat" },
] as const;
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Gunakan format internasional, contoh +6281234567890")
  .optional()
  .or(z.literal(""));

const schema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Min. 8 karakter").regex(/[A-Z]/, "Harus ada huruf kapital").regex(/[0-9]/, "Harus ada angka"),
  phone: phoneSchema,
  gender: z.string().min(1, "Jenis kelamin wajib").refine((value) => genderValues.includes(value), "Jenis kelamin wajib"),
  birthDate: z.string().min(1, "Tanggal lahir wajib"),
  city: z.string().min(1, "Wilayah domisili wajib"),
});

type FormData = z.infer<typeof schema>;
type Step = 1 | 2 | 3;
type CityOption = { id: string; name: string; areas: string[] };
type InterestOption = { id: string; name: string };
type ActionMutation = {
  error: unknown;
  isPending: boolean;
  mutate: () => void;
};
type ApiError = Error & {
  response?: {
    data?: {
      email?: string;
      message?: string;
      requiresVerification?: boolean;
    };
  };
};

const getApiError = (error: unknown) => error as ApiError;
const getApiErrorMessage = (error: unknown, fallback: string) => getApiError(error).response?.data?.message ?? fallback;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<Step>(1);
  const [showPass, setShowPass] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestError, setInterestError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), mode: "onTouched" });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data as CityOption[]),
  });

  const { data: interests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: () => interestsApi.list().then((r) => r.data as InterestOption[]),
  });

  const reg = useMutation({
    mutationFn: (data: FormData) =>
      authApi.register({
        ...data,
        phone: data.phone || undefined,
        birthDate: new Date(data.birthDate).toISOString(),
        interestIds: selectedInterests,
      }),
    onSuccess: (res, variables) => {
      setVerificationEmail(res.data.email ?? variables.email);
      setVerificationCode("");
    },
    onError: (error) => {
      const apiError = getApiError(error);
      if (apiError.response?.data?.requiresVerification && apiError.response.data.email) {
        setVerificationEmail(apiError.response.data.email);
        setVerificationCode("");
      }
    },
    meta: { successMessage: "Kode verifikasi sudah dikirim", errorTitle: "Registrasi gagal" },
  });

  const verifyEmail = useMutation({
    mutationFn: () => authApi.verifyEmail({ email: verificationEmail, code: verificationCode }),
    onSuccess: (res) => {
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
      router.push("/dashboard");
    },
    meta: { successMessage: "Email berhasil diverifikasi", errorTitle: "Verifikasi email gagal" },
  });

  const resendVerification = useMutation({
    mutationFn: () => authApi.resendVerification(verificationEmail),
    meta: { successMessage: "Kode verifikasi dikirim ulang", errorTitle: "Gagal mengirim kode" },
  });

  const nextStep = async () => {
    const fields: Array<keyof FormData> = step === 1 ? ["name", "email", "password"] : ["phone", "gender", "birthDate", "city"];
    const valid = await trigger(fields);
    if (valid) setStep((current) => Math.min(current + 1, 3) as Step);
  };

  const previousStep = () => setStep((current) => Math.max(current - 1, 1) as Step);

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (next.length >= 3) setInterestError("");
      return next;
    });
  };

  const onSubmit = handleSubmit((data) => {
    if (selectedInterests.length < 3) {
      setInterestError("Pilih minimal 3 minat");
      return;
    }

    setInterestError("");
    reg.mutate(data);
  });

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <div className="flex items-center justify-between px-4 py-4">
        <Link href="/" className="flex min-h-11 items-center gap-1.5 text-sm text-brown-500 transition-colors hover:text-teal-600">
          <ArrowLeft className="h-4 w-4" /> Beranda
        </Link>
        <Link href="/" className="flex min-h-11 items-center gap-1.5">
          <BrandLogo className="h-12 w-12 bg-transparent" />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="mb-7 text-center">
            <BrandLogo className="mx-auto mb-4 h-28 w-28 bg-transparent" />
            <h1 className="text-2xl font-extrabold text-teal-600">Buat akun</h1>
            <p className="mt-1.5 text-sm text-brown-400">
              Sudah punya akun?{" "}
              <Link href="/auth/login" className="font-semibold text-brand-500 hover:underline">Masuk</Link>
            </p>
          </div>

          <div className="card-warm p-5 shadow-warm sm:p-6">
            {verificationEmail ? (
              <VerificationPanel
                email={verificationEmail}
                code={verificationCode}
                setCode={setVerificationCode}
                verifyEmail={verifyEmail}
                resendVerification={resendVerification}
                resetEmail={() => {
                  setVerificationEmail("");
                  setVerificationCode("");
                }}
              />
            ) : (
              <>
                <StepProgress currentStep={step} />
                <form
                  onSubmit={(event) => {
                    if (step !== 3) {
                      event.preventDefault();
                      return;
                    }
                    void onSubmit(event);
                  }}
                  className="mt-5 space-y-4"
                >
                  {step === 1 && (
                    <AccountStep
                      register={register}
                      errors={errors}
                      showPass={showPass}
                      setShowPass={setShowPass}
                    />
                  )}

                  {step === 2 && (
                    <ProfileStep register={register} errors={errors} cities={cities} />
                  )}

                  {step === 3 && (
                    <InterestsStep
                      interests={interests}
                      selectedInterests={selectedInterests}
                      toggleInterest={toggleInterest}
                      interestError={interestError}
                      regError={reg.error}
                    />
                  )}

                  <div className="flex gap-3 pt-2">
                    {step > 1 && (
                      <button type="button" onClick={previousStep} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-cream-300 px-4 py-2.5 text-sm font-semibold text-brown-600 hover:bg-cream-100">
                        <ChevronLeft className="h-4 w-4" />
                        Kembali
                      </button>
                    )}

                    {step < 3 ? (
                      <button type="button" onClick={nextStep} className="btn-primary flex-1 px-4 py-2.5">
                        Lanjut
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button type="submit" disabled={reg.isPending} className="btn-primary flex-1 px-4 py-2.5">
                        {reg.isPending ? "Mendaftar..." : "Daftar Sekarang"}
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepProgress({ currentStep }: { currentStep: Step }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((item) => {
        const active = item.id === currentStep;
        const done = item.id < currentStep;
        return (
          <div key={item.id} className="flex items-center gap-2">
            <span className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
              done ? "bg-teal-500 text-white" : active ? "bg-brand-500 text-white" : "bg-cream-200 text-brown-400"
            )}>
              {done ? <Check className="h-4 w-4" /> : item.id}
            </span>
            <span className={cn("text-xs font-semibold", active ? "text-teal-700" : done ? "text-teal-600" : "text-brown-300")}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type AccountStepProps = {
  errors: FieldErrors<FormData>;
  register: UseFormRegister<FormData>;
  setShowPass: Dispatch<SetStateAction<boolean>>;
  showPass: boolean;
};

function AccountStep({ register, errors, showPass, setShowPass }: AccountStepProps) {
  return (
    <>
      <GoogleRedirectButton />
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-cream-200" />
          <span className="text-xs font-medium text-brown-300">atau daftar dengan email</span>
          <span className="h-px flex-1 bg-cream-200" />
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-brown-600">Nama Lengkap</label>
        <input {...register("name")} className="input-warm" autoComplete="name" />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-brown-600">Email</label>
        <input {...register("email")} type="email" className="input-warm" autoComplete="email" />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-brown-600">Password</label>
        <div className="relative">
          <input {...register("password")} type={showPass ? "text" : "password"} className="input-warm pr-11" autoComplete="new-password" />
          <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-brown-400 hover:text-brown-600" aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}>
            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>
    </>
  );
}

type ProfileStepProps = {
  cities: CityOption[];
  errors: FieldErrors<FormData>;
  register: UseFormRegister<FormData>;
};

function ProfileStep({ register, errors, cities }: ProfileStepProps) {
  return (
    <>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-brown-600">No. HP</label>
        <input
          {...register("phone")}
          className="input-warm text-sm"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+6281234567890"
        />
        {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
        {!errors.phone && <p className="mt-1 text-xs text-brown-300">Awali dengan kode negara, tanpa spasi. Contoh: +6281234567890</p>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-brown-600">Jenis Kelamin</label>
          <select {...register("gender")} className="input-warm bg-white text-sm">
            <option value="">Pilih</option>
            <option value="MALE">Pria</option>
            <option value="FEMALE">Wanita</option>
            <option value="OTHER">Lainnya</option>
          </select>
          {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-brown-600">Tanggal Lahir</label>
          <input {...register("birthDate")} type="date" className="input-warm text-sm" />
          {errors.birthDate && <p className="mt-1 text-xs text-red-500">{errors.birthDate.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-brown-600">Wilayah Domisili</label>
        <select {...register("city")} className="input-warm bg-white text-sm" disabled={cities.length === 0}>
          <option value="">Pilih wilayah</option>
          {cities.map((city) => (
            <optgroup key={city.id} label={city.name}>
              {city.areas.map((area: string) => (
                <option key={`${city.name}-${area}`} value={`${city.name} - ${area}`}>{area}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city.message}</p>}
      </div>
    </>
  );
}

type InterestsStepProps = {
  interestError: string;
  interests: InterestOption[];
  regError: unknown;
  selectedInterests: string[];
  toggleInterest: (id: string) => void;
};

function InterestsStep({ interests, selectedInterests, toggleInterest, interestError, regError }: InterestsStepProps) {
  return (
    <>
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="block text-xs font-semibold text-brown-600">Minat & Hobi</label>
          <span className={cn("rounded-full px-2.5 py-1 text-2xs font-semibold", selectedInterests.length >= 3 ? "bg-teal-100 text-teal-700" : "bg-brand-100 text-brand-700")}>
            {selectedInterests.length}/3 minimum
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <button
              type="button"
              key={interest.id}
              onClick={() => toggleInterest(interest.id)}
              className={cn(
                "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                selectedInterests.includes(interest.id)
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-cream-300 bg-white text-brown-600 hover:border-brand-300"
              )}
            >
              {interest.name}
            </button>
          ))}
        </div>
        {interestError && <p className="mt-2 text-xs text-red-500">{interestError}</p>}
      </div>

      {regError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
          {getApiErrorMessage(regError, "Registrasi gagal. Coba lagi.")}
        </div>
      )}

      <p className="text-xs leading-5 text-brown-400">
        Dengan daftar, kamu setuju dengan{" "}
        <Link href="/terms" className="underline hover:text-brand-500">Syarat dan Ketentuan</Link> kami.
      </p>
    </>
  );
}

type VerificationPanelProps = {
  code: string;
  email: string;
  resendVerification: ActionMutation;
  resetEmail: () => void;
  setCode: Dispatch<SetStateAction<string>>;
  verifyEmail: ActionMutation;
};

function VerificationPanel({ email, code, setCode, verifyEmail, resendVerification, resetEmail }: VerificationPanelProps) {
  return (
    <div>
      <div className="mb-5 text-center">
        <h2 className="text-lg font-extrabold text-teal-700">Verifikasi email</h2>
        <p className="mt-1 text-sm leading-6 text-brown-500">
          Kami mengirim kode 6 digit ke {email}.
        </p>
      </div>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        placeholder="123456"
        className="input-warm text-center text-lg font-bold tracking-[0.3em]"
      />

      {verifyEmail.error && (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
          {getApiErrorMessage(verifyEmail.error, "Kode verifikasi tidak valid")}
        </div>
      )}

      <button
        type="button"
        onClick={() => verifyEmail.mutate()}
        disabled={code.length !== 6 || verifyEmail.isPending}
        className="btn-primary mt-4 w-full py-3"
      >
        {verifyEmail.isPending ? "Memverifikasi..." : "Verifikasi & Masuk"}
      </button>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={() => resendVerification.mutate()}
          disabled={resendVerification.isPending}
          className="font-semibold text-brand-600 hover:underline disabled:opacity-50"
        >
          Kirim ulang kode
        </button>
        <button
          type="button"
          onClick={resetEmail}
          className="font-semibold text-brown-400 hover:text-brown-600"
        >
          Ganti email
        </button>
      </div>
    </div>
  );
}
