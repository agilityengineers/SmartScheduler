import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PrivacyPolicy() {
  const [currentDate, setCurrentDate] = useState<string>("");

  useEffect(() => {
    const date = new Date();
    setCurrentDate(
      `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}, ${date.getFullYear()}`
    );
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-500">Last Updated: {currentDate}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
            <p>
              At Smart Scheduler ("we," "our," or "us"), we respect your privacy and are committed to protecting the personal information that you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our calendar scheduling platform and related services (collectively, the "Service").
            </p>
            <p>
              By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by the terms of this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">2.1 Personal Information</h3>
            <p>
              We may collect personal information that you voluntarily provide to us when you:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Create an account and register with us</li>
              <li>Set up your scheduling preferences</li>
              <li>Connect third-party calendar services</li>
              <li>Schedule appointments with others</li>
              <li>Communicate with us</li>
              <li>Subscribe to our services</li>
            </ul>
            <p>
              This information may include:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Name, email address, and contact information</li>
              <li>Account credentials</li>
              <li>Payment and billing information</li>
              <li>Calendar data and scheduling preferences</li>
              <li>Communication preferences</li>
              <li>Organization and team information</li>
            </ul>
            
            <h3 className="text-lg font-medium mb-2">2.2 Calendar Data</h3>
            <p>
              When you connect your third-party calendar (such as Google Calendar), we access your calendar data with your permission to provide our scheduling services. This includes event details, availability, and other calendar-related information.
            </p>
            
            <h3 className="text-lg font-medium mb-2">2.3 Usage Information</h3>
            <p>
              We automatically collect certain information about how you interact with our Service, including:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Log data (IP address, browser type, pages visited, time and date of visits)</li>
              <li>Device information (device type, operating system, unique device identifiers)</li>
              <li>Usage patterns and preferences</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">3. How We Use Your Information</h2>
            <p>
              We use your information for various purposes, including:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Providing and maintaining our Service</li>
              <li>Processing your bookings and scheduling requests</li>
              <li>Managing your account and preferences</li>
              <li>Facilitating calendar synchronization</li>
              <li>Processing payments and subscriptions</li>
              <li>Communicating with you about our Service</li>
              <li>Enhancing and optimizing our Service</li>
              <li>Ensuring security and preventing fraud</li>
              <li>Complying with legal obligations</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">4. How We Share Your Information</h2>
            <p>
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>With third-party calendar service providers (like Google) when you connect your calendars</li>
              <li>With third-party service providers that help us operate our Service (payment processors, hosting services, etc.)</li>
              <li>With your organization or team members, as necessary to provide team-based features</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transaction (merger, acquisition, or sale of assets)</li>
              <li>With your consent or at your direction</li>
            </ul>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, disclosure, alteration, and destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">6. Your Rights and Choices</h2>
            <p>
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc ml-6 mb-4">
              <li>Accessing, correcting, or deleting your personal information</li>
              <li>Restricting or objecting to our processing of your information</li>
              <li>Receiving a copy of your information in a structured, machine-readable format</li>
              <li>Withdrawing your consent at any time (where processing is based on consent)</li>
            </ul>
            <p>
              To exercise these rights, please contact us using the information provided at the end of this Privacy Policy.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">7. Children's Privacy</h2>
            <p>
              Our Service is not directed to children under the age of 16, and we do not knowingly collect personal information from children. If we learn that we have collected personal information from a child under 16, we will promptly delete that information.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">8. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the updated Privacy Policy on our website and, where appropriate, by email.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">9. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <p className="mb-4">
              Email: support@mysmartscheduler.co<br />
              Address: 123 Scheduler Ave, Suite 100, San Francisco, CA 94103
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">10. International Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries other than the country in which you reside. These countries may have data protection laws that are different from the laws of your country. We take steps to ensure that appropriate safeguards are in place to protect your information.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">11. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide you with our Service and for legitimate business purposes, such as maintaining your account, resolving disputes, enforcing our agreements, and as required by law.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">12. Third-Party Links and Services</h2>
            <p>
              Our Service may contain links to third-party websites, services, or applications. We are not responsible for the privacy practices of these third parties, and we encourage you to read their privacy policies before providing any information to them.
            </p>
            
            <h2 className="text-xl font-semibold mb-4 mt-6">13. Cookie Policy</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience with our Service. For more information about our use of cookies, please refer to our Cookie Policy.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}