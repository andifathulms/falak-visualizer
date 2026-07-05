import Link from "next/link";

const LINKS = [
  { href: "/converter", label: "Converter" },
  { href: "/hilal-visibility", label: "Hilal Visibility" },
  { href: "/visibility-map", label: "Visibility Map" },
  { href: "/prayer-times", label: "Prayer Times" },
  { href: "/qibla", label: "Qibla" },
];

export function NavBar() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold">
          Falak
        </Link>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
