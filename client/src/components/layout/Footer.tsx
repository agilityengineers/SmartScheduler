import { Link } from "wouter";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-3 bg-white border-t border-neutral-200 dark:bg-slate-950 dark:border-slate-800 text-neutral-500 dark:text-slate-400 text-sm mt-auto">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0">
        <div className="text-center">
          © {currentYear} SmartScheduler | a, <a 
            href="https://www.agility-engineers.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline transition-colors"
          >
            Agility Engineers, LLC
          </a> application | <Link 
            href="/privacy-policy"
            className="hover:text-primary hover:underline transition-colors"
          >
            Privacy Policy
          </Link> | <Link 
            href="/terms-of-service"
            className="hover:text-primary hover:underline transition-colors"
          >
            Terms of Service
          </Link>. All rights reserved.
        </div>
      </div>
    </footer>
  );
}