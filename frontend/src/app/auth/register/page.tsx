"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useMemo, useState } from "react";
import { type FieldErrors, type UseFormRegister, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, CalendarDays, Check, Eye, EyeOff } from "lucide-react";
import { GoogleRedirectButton } from "@/components/auth/GoogleRedirectButton";
import { authApi, citiesApi, interestsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const genderValues = ["MALE", "FEMALE", "OTHER"] as const;
const activityOptions = ["Sekolah", "Kuliah", "Kerja", "Wirausaha", "Ibu Rumah Tangga", "Ga Ada"];
const industryOptions = [
  "Teknologi",
  "Keuangan & Perbankan",
  "Pendidikan",
  "Pemerintahan",
  "Kuliner",
  "Kesehatan",
  "Properti",
  "Retail",
  "Media & Kreatif",
  "Lainnya",
];
const leisureOptions = ["Nonton", "Olahraga", "Travelling", "Musik", "Ngegame", "Nongkrong", "Baca Buku", "Makan"];
const maxChoices = 3;
const totalSteps = 10;
const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const phoneLocalSchema = z
  .string()
  .trim()
  .regex(/^8\d{7,12}$/, "Masukkan nomor WA tanpa 0, contoh 81234567890");

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phoneLocal: phoneLocalSchema,
  email: z.string().trim().email("Email tidak valid"),
  password: z
    .string()
    .min(8, "Min. 8 karakter")
    .regex(/[A-Z]/, "Harus ada huruf kapital")
    .regex(/[0-9]/, "Harus ada angka"),
  gender: z.enum(genderValues, { required_error: "Jenis kelamin wajib" }),
  birthDate: z.string().min(1, "Tanggal lahir wajib"),
  city: z.string().min(1, "Wilayah domisili wajib"),
  activity: z.string().min(1, "Pilih kegiatan kamu"),
  industry: z.string().min(1, "Pilih bidang yang paling dekat"),
  socialComfort: z.number({ required_error: "Pilih level kenyamanan" }).int().min(1).max(5),
  smokes: z.boolean({ required_error: "Pilih salah satu" }),
  drinksAlcohol: z.boolean({ required_error: "Pilih salah satu" }),
  dietaryNotes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type CityOption = { id: string; name: string; areas: string[] };
type InterestOption = { id: string; name: string };
type ApiError = Error & {
  response?: {
    data?: {
      email?: string;
      message?: string;
      requiresVerification?: boolean;
    };
  };
};

const stepFields: Record<Step, Array<keyof FormData>> = {
  1: ["name", "phoneLocal"],
  2: ["email", "password"],
  3: ["birthDate", "gender"],
  4: ["city"],
  5: ["activity"],
  6: ["industry"],
  7: ["socialComfort"],
  8: [],
  9: [],
  10: ["smokes", "drinksAlcohol", "dietaryNotes"],
};

const getApiError = (error: unknown) => error as ApiError;
const getApiErrorMessage = (error: unknown, fallback: string) => getApiError(error).response?.data?.message ?? fallback;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [step, setStep] = useState<Step>(1);
  const [showPass, setShowPass] = useState(false);
  const [selectedLeisure, setSelectedLeisure] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [choiceError, setChoiceError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      phoneLocal: "",
      email: "",
      password: "",
      birthDate: "",
      city: "",
      activity: "",
      industry: "",
      dietaryNotes: "",
    },
  });

  const formValues = watch();

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: () => citiesApi.list().then((r) => r.data as CityOption[]),
  });

  const { data: interests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: () => interestsApi.list().then((r) => r.data as InterestOption[]),
  });

  const flatCityOptions = useMemo(
    () =>
      cities.flatMap((city) =>
        city.areas.map((area) => ({
          label: `${area}, ${city.name}`,
          value: `${city.name} - ${area}`,
        }))
      ),
    [cities]
  );

  const reg = useMutation({
    mutationFn: (data: FormData) =>
      authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: `+62${data.phoneLocal}`,
        gender: data.gender,
        birthDate: new Date(data.birthDate).toISOString(),
        city: data.city,
        interestIds: selectedInterests,
        activity: data.activity,
        industry: data.industry,
        socialComfort: data.socialComfort,
        leisureTopics: selectedLeisure,
        conversationTopics: selectedInterests
          .map((id) => interests.find((interest) => interest.id === id)?.name)
          .filter(Boolean),
        smokes: data.smokes,
        drinksAlcohol: data.drinksAlcohol,
        dietaryNotes: data.dietaryNotes?.trim() || undefined,
      }),
    onSuccess: (res) => {
      const { user, accessToken, refreshToken } = res.data;
      setAuth(user, accessToken, refreshToken);
      router.push("/auth/register/success");
    },
    onError: (error) => {
      const apiError = getApiError(error);
      if (apiError.response?.data?.requiresVerification && apiError.response.data.email) {
        setChoiceError("Akun ini masih memakai alur lama. Silakan login ulang.");
      }
    },
    meta: { successMessage: "Akun berhasil dibuat", errorTitle: "Registrasi gagal" },
  });

  const validateChoiceStep = () => {
    if (step === 8 && selectedLeisure.length !== maxChoices) {
      setChoiceError(`Pilih ${maxChoices} kegiatan dulu`);
      return false;
    }
    if (step === 9 && selectedInterests.length !== maxChoices) {
      setChoiceError(`Pilih ${maxChoices} topik dulu`);
      return false;
    }
    setChoiceError("");
    return true;
  };

  const nextStep = async () => {
    const valid = await trigger(stepFields[step]);
    if (!valid || !validateChoiceStep()) return;
    setStep((current) => Math.min(current + 1, totalSteps) as Step);
  };

  const previousStep = () => {
    if (step === 1) {
      router.push("/");
      return;
    }
    setStep((current) => Math.max(current - 1, 1) as Step);
  };

  const toggleLimitedChoice = (
    value: string,
    selectedValues: string[],
    setSelectedValues: Dispatch<SetStateAction<string[]>>
  ) => {
    setSelectedValues((prev) => {
      const selected = prev.includes(value);
      const next = selected ? prev.filter((item) => item !== value) : prev.length < maxChoices ? [...prev, value] : prev;
      if (next.length === maxChoices) setChoiceError("");
      return next;
    });
  };

  const onSubmit = handleSubmit((data) => {
    if (selectedLeisure.length !== maxChoices || selectedInterests.length !== maxChoices) {
      setChoiceError(`Pilih ${maxChoices} pilihan di tiap langkah`);
      return;
    }

    setChoiceError("");
    reg.mutate(data);
  });

  return (
    <AuthFrame
      onBack={previousStep}
      footer={
        step < totalSteps ? (
          <button type="button" onClick={nextStep} className="register-primary-button">
            {step === 1 ? "Mulai" : "Lanjutkan"}
          </button>
        ) : (
          <button type="button" onClick={() => void onSubmit()} disabled={reg.isPending} className="register-primary-button">
            {reg.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        )
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step === totalSteps) void onSubmit(event);
        }}
      >
        <StepDots currentStep={step} />

        {step === 1 && <ContactStep register={register} errors={errors} />}
        {step === 2 && (
          <AccountStep
            register={register}
            errors={errors}
            showPass={showPass}
            setShowPass={setShowPass}
          />
        )}
        {step === 3 && (
          <ProfileStep
            register={register}
            errors={errors}
            birthDate={formValues.birthDate}
            setBirthDate={(value) => setValue("birthDate", value, { shouldDirty: true, shouldValidate: true })}
            gender={formValues.gender}
            setGender={(value) => setValue("gender", value, { shouldDirty: true, shouldValidate: true })}
          />
        )}
        {step === 4 && (
          <CityStep
            cityOptions={flatCityOptions}
            selectedCity={formValues.city}
            setCity={(value) => setValue("city", value, { shouldDirty: true, shouldValidate: true })}
            error={errors.city?.message}
          />
        )}
        {step === 5 && (
          <SingleChoiceStep
            title="Apa kegiatan kamu sekarang?"
            options={activityOptions}
            selectedValue={formValues.activity}
            setValue={(value) => setValue("activity", value, { shouldDirty: true, shouldValidate: true })}
            error={errors.activity?.message}
          />
        )}
        {step === 6 && (
          <SingleChoiceStep
            title="Bidang kamu paling dekat dengan apa?"
            options={industryOptions}
            selectedValue={formValues.industry}
            setValue={(value) => setValue("industry", value, { shouldDirty: true, shouldValidate: true })}
            error={errors.industry?.message}
          />
        )}
        {step === 7 && (
          <ComfortStep
            value={formValues.socialComfort}
            setValue={(value) => setValue("socialComfort", value, { shouldDirty: true, shouldValidate: true })}
            error={errors.socialComfort?.message}
          />
        )}
        {step === 8 && (
          <MultiChoiceStep
            title="Apa yang biasa kamu lakuin di waktu luang?"
            options={leisureOptions}
            selectedValues={selectedLeisure}
            toggle={(value) => toggleLimitedChoice(value, selectedLeisure, setSelectedLeisure)}
            error={choiceError}
          />
        )}
        {step === 9 && (
          <MultiChoiceStep
            title="Pilih topik obrolan yang paling kamu suka"
            options={interests.map((interest) => ({ id: interest.id, label: interest.name }))}
            selectedValues={selectedInterests}
            toggle={(value) => toggleLimitedChoice(value, selectedInterests, setSelectedInterests)}
            error={choiceError}
          />
        )}
        {step === 10 && (
          <FinalStep
            register={register}
            errors={errors}
            smokes={formValues.smokes}
            drinksAlcohol={formValues.drinksAlcohol}
            setSmokes={(value) => setValue("smokes", value, { shouldDirty: true, shouldValidate: true })}
            setDrinksAlcohol={(value) => setValue("drinksAlcohol", value, { shouldDirty: true, shouldValidate: true })}
            regError={reg.error}
          />
        )}
      </form>
    </AuthFrame>
  );
}

function AuthFrame({ children, footer, onBack }: { children: React.ReactNode; footer: React.ReactNode; onBack: () => void }) {
  return (
    <main className="min-h-dvh bg-[#fff1d8] text-slate-950">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] pt-[calc(env(safe-area-inset-top,0px)+18px)]">
        <header className="flex h-12 items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 flex h-12 w-12 items-center justify-center rounded-full text-slate-950 transition-colors active:bg-white/50"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-9 w-9 stroke-[3]" />
          </button>
          <Link href="/auth/login" className="rounded-full px-3 py-2 text-sm font-bold text-[#c29254]">
            Masuk
          </Link>
        </header>

        <section className="flex-1 pt-7">{children}</section>
        <footer className="sticky bottom-0 mt-8 bg-gradient-to-t from-[#fff1d8] via-[#fff1d8] to-[#fff1d8]/0 pb-1 pt-7">
          {footer}
        </footer>
      </div>
    </main>
  );
}

function StepDots({ currentStep }: { currentStep: Step }) {
  return (
    <div className="mb-8 flex items-center gap-1.5" aria-label={`Langkah ${currentStep} dari ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, index) => index + 1).map((item) => (
        <span
          key={item}
          className={cn(
            "h-1.5 rounded-full transition-all",
            item === currentStep ? "w-7 bg-slate-950" : item < currentStep ? "w-3.5 bg-[#c29254]" : "w-3.5 bg-white/70"
          )}
        />
      ))}
    </div>
  );
}

type ContactStepProps = {
  errors: FieldErrors<FormData>;
  register: UseFormRegister<FormData>;
};

function ContactStep({ register, errors }: ContactStepProps) {
  return (
    <div className="space-y-9">
      <h1 className="text-[29px] font-black leading-tight tracking-[-0.02em] text-slate-950">Kenalan dulu yuk!</h1>

      <div>
        <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Siapa nama panggilan kamu?</label>
        <input {...register("name")} className="register-pill-input" autoComplete="name" placeholder="Nama kamu" />
        {errors.name && <ErrorText message={errors.name.message} />}
      </div>

      <div>
        <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Nomor WA yang bisa dihubungi</label>
        <div className="grid grid-cols-[78px_1fr] gap-1">
          <div className="flex min-h-[76px] items-center justify-center rounded-[28px] bg-white text-base font-semibold text-slate-950">
            +62
          </div>
          <input
            {...register("phoneLocal")}
            className="register-pill-input rounded-l-md"
            autoComplete="tel"
            inputMode="tel"
            placeholder="Nomor WA"
          />
        </div>
        {errors.phoneLocal ? (
          <ErrorText message={errors.phoneLocal.message} />
        ) : (
          <p className="mt-2 text-sm font-medium leading-5 text-[#c29254]">Kita akan menggunakan nomor ini untuk menghubungi kamu</p>
        )}
      </div>
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
    <div className="space-y-7">
      <div>
        <h1 className="text-[29px] font-black leading-tight tracking-[-0.02em] text-slate-950">Bikin akses akun kamu</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#c29254]">Email ini dipakai untuk verifikasi dan info dinner.</p>
      </div>

      <GoogleRedirectButton />

      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-white" />
          <span className="text-xs font-bold text-[#c29254]">atau daftar dengan email</span>
          <span className="h-px flex-1 bg-white" />
        </div>
      )}

      <div>
        <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Email</label>
        <input {...register("email")} type="email" className="register-pill-input" autoComplete="email" placeholder="kamu@email.com" />
        {errors.email && <ErrorText message={errors.email.message} />}
      </div>

      <div>
        <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Password</label>
        <div className="relative">
          <input
            {...register("password")}
            type={showPass ? "text" : "password"}
            className="register-pill-input pr-16"
            autoComplete="new-password"
            placeholder="Min. 8 karakter"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[#c29254] transition-colors active:bg-[#fff1d8]"
            aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <ErrorText message={errors.password.message} />}
      </div>
    </div>
  );
}

type ProfileStepProps = {
  birthDate?: string;
  errors: FieldErrors<FormData>;
  gender?: string;
  register: UseFormRegister<FormData>;
  setBirthDate: (value: string) => void;
  setGender: (value: "MALE" | "FEMALE" | "OTHER") => void;
};

function ProfileStep({ birthDate, register, errors, gender, setBirthDate, setGender }: ProfileStepProps) {
  return (
    <div className="space-y-9">
      <div>
        <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Tanggal lahir kamu kapan?</label>
        <input {...register("birthDate")} type="hidden" />
        <BirthDatePicker value={birthDate} onChange={setBirthDate} />
        {errors.birthDate && <ErrorText message={errors.birthDate.message} />}
      </div>

      <div>
        <p className="mb-4 text-[15px] font-bold text-[#c29254]">Jenis kelamin kamu apa?</p>
        <div className="grid grid-cols-2 gap-2">
          <ColorChoice selected={gender === "FEMALE"} onClick={() => setGender("FEMALE")} variant="rose">
            Cewek
          </ColorChoice>
          <ColorChoice selected={gender === "MALE"} onClick={() => setGender("MALE")} variant="blue">
            Cowok
          </ColorChoice>
        </div>
        <button
          type="button"
          onClick={() => setGender("OTHER")}
          className={cn(
            "mt-3 flex min-h-[60px] w-full items-center justify-center rounded-[24px] text-lg font-black transition-colors",
            gender === "OTHER" ? "bg-slate-950 text-white" : "bg-white text-[#c29254]"
          )}
        >
          Lainnya
        </button>
        {errors.gender && <ErrorText message={errors.gender.message} />}
      </div>
    </div>
  );
}

function BirthDatePicker({ onChange, value }: { onChange: (value: string) => void; value?: string }) {
  const today = new Date();
  const latestYear = today.getFullYear() - 13;
  const earliestYear = today.getFullYear() - 70;
  const parsed = parseBirthDate(value);
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(parsed?.day ?? 1);
  const [month, setMonth] = useState(parsed?.month ?? 1);
  const [year, setYear] = useState(parsed?.year ?? latestYear - 7);
  const maxDay = getDaysInMonth(year, month);
  const selectedDay = Math.min(day, maxDay);
  const display = parsed ? `${parsed.day} ${monthNames[parsed.month - 1]} ${parsed.year}` : "Pilih tanggal lahir";
  const years = useMemo(
    () => Array.from({ length: latestYear - earliestYear + 1 }, (_, index) => latestYear - index),
    [earliestYear, latestYear]
  );

  const openPicker = () => {
    const current = parseBirthDate(value);
    setDay(current?.day ?? selectedDay);
    setMonth(current?.month ?? month);
    setYear(current?.year ?? year);
    setOpen(true);
  };

  const confirmDate = () => {
    onChange(`${year}-${padDate(month)}-${padDate(selectedDay)}`);
    setDay(selectedDay);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "flex min-h-[76px] w-full items-center justify-between rounded-[28px] bg-white px-7 text-left text-lg font-black transition-colors active:bg-white/70",
          parsed ? "text-slate-950" : "text-[#d8b27c]"
        )}
      >
        <span>{display}</span>
        <CalendarDays className="h-5 w-5 flex-shrink-0 text-[#d8b27c]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 pb-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} aria-label="Tutup pilihan tanggal" />
          <div className="relative w-full max-w-[430px] rounded-[34px] bg-[#fff1d8] px-5 pb-5 pt-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#c29254]">Tanggal lahir</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">Pilih tanggal</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-black text-[#c29254] active:scale-95"
                aria-label="Batal pilih tanggal"
              >
                X
              </button>
            </div>

            <div className="grid grid-cols-[0.8fr_1.2fr_1fr] gap-2">
              <PickerSelect label="Tanggal" value={selectedDay} onChange={(next) => setDay(next)}>
                {Array.from({ length: maxDay }, (_, index) => index + 1).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </PickerSelect>

              <PickerSelect label="Bulan" value={month} onChange={(next) => setMonth(next)}>
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </PickerSelect>

              <PickerSelect label="Tahun" value={year} onChange={(next) => setYear(next)}>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </PickerSelect>
            </div>

            <div className="mt-5 rounded-[26px] bg-white px-5 py-4 text-center">
              <p className="text-xs font-black text-[#c29254]">Format</p>
              <p className="mt-1 text-lg font-black text-slate-950">
                {selectedDay} {monthNames[month - 1]} {year}
              </p>
            </div>

            <button type="button" onClick={confirmDate} className="register-primary-button mt-5">
              Pakai tanggal ini
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function PickerSelect({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-center text-xs font-black text-[#c29254]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-16 w-full rounded-[24px] border-0 bg-white px-3 text-center text-base font-black text-slate-950 outline-none ring-0 focus:ring-4 focus:ring-white/70"
      >
        {children}
      </select>
    </label>
  );
}

function parseBirthDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { day, month, year };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function padDate(value: number) {
  return String(value).padStart(2, "0");
}

function CityStep({
  cityOptions,
  error,
  selectedCity,
  setCity,
}: {
  cityOptions: { label: string; value: string }[];
  error?: string;
  selectedCity?: string;
  setCity: (value: string) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[29px] font-black leading-tight tracking-[-0.02em] text-slate-950">Kamu tinggal di area mana?</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-[#c29254]">Pilih wilayah terdekat supaya kami bisa rekomendasikan dinner yang pas.</p>
      </div>

      <div className="space-y-3">
        {cityOptions.length === 0 ? (
          <div className="rounded-[28px] bg-white px-6 py-5 text-sm font-bold text-[#c29254]">Memuat pilihan wilayah...</div>
        ) : (
          cityOptions.map((city) => (
            <button
              key={city.value}
              type="button"
              onClick={() => setCity(city.value)}
              className={cn("register-dark-choice", selectedCity === city.value ? "bg-slate-950 text-white" : "bg-white text-[#c29254]")}
            >
              {city.label}
            </button>
          ))
        )}
      </div>
      {error && <ErrorText message={error} />}
    </div>
  );
}

function SingleChoiceStep({
  error,
  options,
  selectedValue,
  setValue,
  title,
}: {
  error?: string;
  options: string[];
  selectedValue?: string;
  setValue: (value: string) => void;
  title: string;
}) {
  return (
    <div className="space-y-7">
      <h1 className="text-[29px] font-black leading-tight tracking-[-0.02em] text-slate-950">{title}</h1>
      <div className="space-y-2.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setValue(option)}
            className={cn("register-dark-choice", selectedValue === option ? "bg-[#bf8ab2] text-white" : "bg-slate-950 text-white")}
          >
            {option}
          </button>
        ))}
      </div>
      {error && <ErrorText message={error} />}
    </div>
  );
}

function ComfortStep({ error, setValue, value }: { error?: string; setValue: (value: number) => void; value?: number }) {
  return (
    <div className="space-y-8">
      <h1 className="text-[29px] font-black leading-tight tracking-[-0.02em] text-slate-950">
        Seberapa nyaman kamu ngobrol sama orang baru?
      </h1>
      <div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setValue(item)}
              className={cn(
                "flex aspect-square min-h-14 items-center justify-center rounded-full text-lg font-black transition-colors",
                value === item ? "bg-[#bf8ab2] text-white ring-4 ring-white" : "bg-slate-950 text-white"
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-sm font-bold text-[#c29254]">
          <span>Ga nyaman</span>
          <span>Nyaman banget</span>
        </div>
        {error && <ErrorText message={error} />}
      </div>
    </div>
  );
}

function MultiChoiceStep({
  error,
  options,
  selectedValues,
  title,
  toggle,
}: {
  error?: string;
  options: Array<string | { id: string; label: string }>;
  selectedValues: string[];
  title: string;
  toggle: (value: string) => void;
}) {
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[29px] font-black leading-tight tracking-[-0.02em] text-slate-950">{title}</h1>
        <p className="mt-7 text-[15px] font-bold text-[#c29254]">Pilih maksimal {maxChoices}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {options.map((option) => {
          const value = typeof option === "string" ? option : option.id;
          const label = typeof option === "string" ? option : option.label;
          const selected = selectedValues.includes(value);
          return (
            <button
              type="button"
              key={value}
              onClick={() => toggle(value)}
              className={cn(
                "flex min-h-[78px] items-center justify-center rounded-[28px] px-3 text-center text-base font-black transition-colors",
                selected ? "bg-slate-950 text-white" : "bg-white text-[#c29254]",
                !selected && selectedValues.length >= maxChoices && "opacity-60"
              )}
            >
              <span className="line-clamp-2">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm font-bold text-[#c29254]">
        <span>{selectedValues.length}/{maxChoices} dipilih</span>
        {selectedValues.length === maxChoices && (
          <span className="inline-flex items-center gap-1 text-slate-950">
            <Check className="h-4 w-4" /> Siap
          </span>
        )}
      </div>
      {error && <ErrorText message={error} />}
    </div>
  );
}

function FinalStep({
  drinksAlcohol,
  errors,
  register,
  regError,
  setDrinksAlcohol,
  setSmokes,
  smokes,
}: {
  drinksAlcohol?: boolean;
  errors: FieldErrors<FormData>;
  register: UseFormRegister<FormData>;
  regError: unknown;
  setDrinksAlcohol: (value: boolean) => void;
  setSmokes: (value: boolean) => void;
  smokes?: boolean;
}) {
  return (
    <div className="space-y-8">
      <h1 className="text-[29px] font-black leading-tight tracking-[-0.02em] text-slate-950">Terakhir...</h1>

      <BooleanChoice label="Kamu ngerokok ga?" value={smokes} setValue={setSmokes} error={errors.smokes?.message} />
      <BooleanChoice label="Minum alkohol?" value={drinksAlcohol} setValue={setDrinksAlcohol} error={errors.drinksAlcohol?.message} />

      <div>
        <label className="mb-3 block text-[15px] font-bold text-[#c29254]">Ada alergi/pantangan makanan? (Opsional)</label>
        <input
          {...register("dietaryNotes")}
          className="register-pill-input"
          placeholder="Alergi/pantangan makan kamu"
        />
        {errors.dietaryNotes && <ErrorText message={errors.dietaryNotes.message} />}
      </div>

      {Boolean(regError) && (
        <div className="rounded-[24px] border border-red-100 bg-white px-5 py-4 text-sm font-semibold leading-6 text-red-600">
          {getApiErrorMessage(regError, "Registrasi gagal. Coba lagi.")}
        </div>
      )}

      <p className="text-xs font-semibold leading-5 text-[#c29254]">
        Dengan daftar, kamu setuju dengan{" "}
        <Link href="/terms" className="underline decoration-2 underline-offset-2">
          Syarat dan Ketentuan
        </Link>{" "}
        RuangTemu.
      </p>
    </div>
  );
}

function BooleanChoice({
  error,
  label,
  setValue,
  value,
}: {
  error?: string;
  label: string;
  setValue: (value: boolean) => void;
  value?: boolean;
}) {
  return (
    <div>
      <p className="mb-3 text-[15px] font-bold text-[#c29254]">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <ColorChoice selected={value === true} onClick={() => setValue(true)} variant="rose">
          Ya
        </ColorChoice>
        <ColorChoice selected={value === false} onClick={() => setValue(false)} variant="blue">
          Tidak
        </ColorChoice>
      </div>
      {error && <ErrorText message={error} />}
    </div>
  );
}

function ColorChoice({
  children,
  onClick,
  selected,
  variant,
}: {
  children: React.ReactNode;
  onClick: () => void;
  selected: boolean;
  variant: "blue" | "rose";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[78px] items-center justify-center rounded-[28px] text-lg font-black text-white transition-transform active:scale-[0.98]",
        variant === "rose" ? "bg-[#bf8ab2]" : "bg-[#8bb1b8]",
        selected && "ring-4 ring-slate-950/80"
      )}
    >
      {children}
    </button>
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm font-bold leading-5 text-red-600">{message}</p>;
}
