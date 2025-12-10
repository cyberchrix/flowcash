import Image from "next/image";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-2 backdrop-blur-md border-b border-white/10 pt-3">
      {/* FlowCash icon centered */}
      <Image
        src="/availo-icon_v6.png"
        alt="Availo Icon"
        width={40}
        height={40}
        priority
      />

      {/* CH avatar on the right, smaller */}
      <div className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-full bg-flow-primary shadow-flowSoft">
        <span className="text-[10px] font-semibold text-white">CH</span>
      </div>
    </header>
  );
}

