import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900">
      <AppHeader />
      
      <main className="flex-1 container max-w-4xl mx-auto py-8 px-4">
        <Link href="/">
          <Button variant="ghost" className="mb-6 pl-0 flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Button>
        </Link>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p className="text-lg text-neutral-700 dark:text-slate-300">
            Last updated: April 10, 2025
          </p>
          
          <h2>Introduction</h2>
          <p>
            At SmartScheduler, we take your privacy seriously. This Privacy Policy describes how we collect, use, 
            process, and disclose your information, including personal information, in conjunction with your access 
            to and use of the SmartScheduler platform.
          </p>
          
          <h2>Information We Collect</h2>
          <h3>Information You Provide to Us</h3>
          <p>
            We collect information you provide directly to us when you:
          </p>
          <ul>
            <li>Create or modify your account</li>
            <li>Schedule or manage calendar events</li>
            <li>Connect third-party integrations (like Google Calendar)</li>
            <li>Communicate with other users through our platform</li>
            <li>Contact customer support</li>
          </ul>
            
          <h3>Information We Automatically Collect</h3>
          <p>
            When you use our platform, we automatically collect:
          </p>
          <ul>
            <li>Usage data (such as how you interact with the application)</li>
            <li>Device information (operating system, browser type, etc.)</li>
            <li>Log data (IP address, access times, etc.)</li>
          </ul>
          
          <h2>How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send administrative notifications and updates</li>
            <li>Respond to your comments and questions</li>
            <li>Analyze usage patterns to enhance user experience</li>
            <li>Protect against fraudulent or illegal activity</li>
          </ul>
          
          <h2>Data Sharing and Disclosure</h2>
          <p>
            We may share your information with:
          </p>
          <ul>
            <li>Third-party service providers who perform services on our behalf</li>
            <li>Partners with whom you've connected your SmartScheduler account</li>
            <li>Law enforcement agencies when required by law</li>
          </ul>
          
          <h2>Your Rights and Choices</h2>
          <p>
            You have the right to:
          </p>
          <ul>
            <li>Access, update or delete your personal information</li>
            <li>Object to our processing of your data</li>
            <li>Opt out of marketing communications</li>
            <li>Request data portability</li>
          </ul>
          
          <h2>Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information 
            against unauthorized or unlawful processing, accidental loss, destruction, or damage.
          </p>
          
          <h2>Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to provide our services and fulfill the 
            purposes described in this policy, unless a longer retention period is required by law.
          </p>
          
          <h2>International Data Transfers</h2>
          <p>
            Your information may be transferred to, and processed in, countries other than the country in which you reside. 
            These countries may have data protection laws that are different from the laws of your country.
          </p>
          
          <h2>Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new 
            policy on this page and updating the "Last updated" date.
          </p>
          
          <h2>Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p>
            Agility Engineers, LLC<br />
            Email: privacy@mysmartscheduler.co<br />
            Website: <a href="https://www.agility-engineers.com/" target="_blank" rel="noopener noreferrer">www.agility-engineers.com</a>
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}