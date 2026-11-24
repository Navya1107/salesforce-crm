import { useState } from "react";
import { createContact } from "../../services/contactService";

export default function ContactForm({ refreshContacts }) {
  const [formData, setFormData] = useState({
    
  FirstName: "",
  LastName: "",
  Email: "",
  Phone: "",
  Title: "",
  AccountId: "",
  OwnerId: "u1",
});

  

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createContact(formData);

      setFormData({
        FirstName: "",
        LastName: "",
        Email: "",
      });

      setError("");

      refreshContacts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Add Contact</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="FirstName"
          placeholder="First Name"
          value={formData.FirstName}
          onChange={handleChange}
        />

        <input
          type="text"
          name="LastName"
          placeholder="Last Name"
          value={formData.LastName}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="Email"
          placeholder="Email"
          value={formData.Email}
          onChange={handleChange}
          required
        />

        <button type="submit">
          Add Contact
        </button>
      </form>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}
    </div>
  );
}
