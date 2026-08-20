import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="font-jakarta flex flex-1 flex-col items-center gap-6 bg-stara-bg px-6 py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-stara-coral to-stara-navy text-xl">
        🎬
      </div>
      <div className="text-center">
        <h1 className="font-fraunces text-2xl font-bold text-stara-navy">Welcome to STARA</h1>
        <p className="mt-1 text-sm text-stone-500">
          K-콘텐츠 여행 루트를 만들려면 먼저 로그인해주세요.
        </p>
      </div>
      <SignIn
        appearance={{
          variables: { colorPrimary: "#ff8f7a" },
        }}
      />
    </div>
  );
}
