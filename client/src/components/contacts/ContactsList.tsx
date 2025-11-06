import { useState } from "react";
import { ContactCard } from "./ContactCard";
import { ContactDetailsModal } from "./ContactDetailsModal";
import { Contact } from "@/hooks/useContacts";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ContactsListProps {
  contacts: Contact[];
}

export function ContactsList({ contacts }: ContactsListProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search contacts by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results count */}
        {searchQuery && (
          <div className="text-sm text-muted-foreground">
            Found {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
          </div>
        )}

        {/* Contacts grid */}
        {filteredContacts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.email}
                contact={contact}
                onClick={() => setSelectedContact(contact)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? (
              <p>No contacts found matching "{searchQuery}"</p>
            ) : (
              <p>No contacts yet. Contacts will appear here once people book appointments with you.</p>
            )}
          </div>
        )}
      </div>

      {/* Contact details modal */}
      <ContactDetailsModal
        contact={selectedContact}
        open={!!selectedContact}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null);
        }}
      />
    </>
  );
}
