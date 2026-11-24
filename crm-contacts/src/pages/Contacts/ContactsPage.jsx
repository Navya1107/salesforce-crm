import { useEffect, useState } from "react";
import ContactForm from "../../components/Contacts/ContactForm";
import ContactTable from "../../components/Contacts/ContactTable";
import { getContacts } from "../../services/contactService";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);

  const loadContacts = async () => {
    try {
      const data = await getContacts();
      setContacts(data);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Contacts</h1>

      <ContactForm refreshContacts={loadContacts} />

      <hr />

      <ContactTable contacts={contacts} />
    </div>
  );
}