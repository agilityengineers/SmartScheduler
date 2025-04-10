import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";

export default function TermsOfService() {
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
          <h1>Terms of Service</h1>
          <p className="text-lg text-neutral-700 dark:text-slate-300">
            Last updated: April 10, 2025
          </p>
          
          <h2>Introduction</h2>
          <p>
            Welcome to SmartScheduler. These Terms of Service ("Terms") govern your access to and use of the SmartScheduler 
            platform, including any related mobile applications, websites, and services (collectively, the "Service"). 
            By accessing or using the Service, you agree to be bound by these Terms.
          </p>
          
          <h2>Using Our Service</h2>
          
          <h3>Account Registration</h3>
          <p>
            To use certain features of the Service, you must register for an account. You agree to provide accurate, current, 
            and complete information during the registration process and to update such information to keep it accurate, 
            current, and complete.
          </p>
          
          <h3>Account Security</h3>
          <p>
            You are responsible for safeguarding your account password and for any activities or actions under your account. 
            You agree to notify us immediately of any unauthorized use of your account.
          </p>
          
          <h3>Acceptable Use</h3>
          <p>
            You agree not to use the Service to:
          </p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe the intellectual property rights of others</li>
            <li>Transmit any material that is harmful, threatening, abusive, or otherwise objectionable</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Attempt to gain unauthorized access to the Service or related systems</li>
          </ul>
          
          <h2>Subscription and Fees</h2>
          <p>
            Some aspects of the Service may require a subscription. Subscription fees are non-refundable except as required by law 
            or as explicitly stated in these Terms.
          </p>
          
          <h3>Free Trial</h3>
          <p>
            We may offer free trial periods for certain subscriptions. At the end of the trial period, we will automatically 
            charge the applicable subscription fee unless you cancel before the trial ends.
          </p>
          
          <h3>Changes to Fees</h3>
          <p>
            We reserve the right to modify our subscription fees at any time. We will provide notice of any fee change before it 
            becomes effective. Your continued use of the Service after the fee change becomes effective constitutes your 
            agreement to pay the modified fee amount.
          </p>
          
          <h2>Intellectual Property Rights</h2>
          
          <h3>Our Intellectual Property</h3>
          <p>
            The Service and its original content, features, and functionality are owned by SmartScheduler and are protected by 
            international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
          </p>
          
          <h3>Your Content</h3>
          <p>
            You retain all rights to any content you submit, post, or display on or through the Service. By submitting content to 
            the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, 
            and display such content in connection with providing the Service to you and other users.
          </p>
          
          <h2>Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, 
            for any reason, including if you breach these Terms.
          </p>
          
          <h2>Disclaimers</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
          </p>
          
          <h2>Limitation of Liability</h2>
          <p>
            IN NO EVENT SHALL SMARTSCHEDULER, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS, BE LIABLE FOR ANY INDIRECT, 
            INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
          
          <h2>Changes to These Terms</h2>
          <p>
            We may modify these Terms at any time. We will provide notice of any material changes by posting the updated Terms 
            on this page and updating the "Last updated" date above. Your continued use of the Service after any such changes 
            constitutes your acceptance of the new Terms.
          </p>
          
          <h2>Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of the jurisdiction in which Agility Engineers, LLC is established, 
            without regard to its conflict of law provisions.
          </p>
          
          <h2>Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            Agility Engineers, LLC<br />
            Email: legal@mysmartscheduler.co<br />
            Website: <a href="https://www.agility-engineers.com/" target="_blank" rel="noopener noreferrer">www.agility-engineers.com</a>
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}