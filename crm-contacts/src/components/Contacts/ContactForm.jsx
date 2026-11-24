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
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createContact(formData);

      setFormData({
        FirstName: "",
        LastName: "",
        Email: "",
        Phone: "",
        Title: "",
        AccountId: "",
        OwnerId: "u1",
      });

      setError("");
      refreshContacts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Create Contact</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            type="text"
            name="FirstName"
            placeholder="First Name"
            value={formData.FirstName}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <input
            type="text"
            name="LastName"
            placeholder="Last Name"
            value={formData.LastName}
            onChange={handleChange}
            required
          />
        </div>

        <br />

        <div>
          <input
            type="email"
            name="Email"
            placeholder="Email"
            value={formData.Email}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <input
            type="text"
            name="Phone"
            placeholder="Phone"
            value={formData.Phone}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <input
            type="text"
            name="Title"
            placeholder="Job Title"
            value={formData.Title}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <input
            type="text"
            name="AccountId"
            placeholder="Account Id"
            value={formData.AccountId}
            onChange={handleChange}
          />
        </div>

        <br />

        <div>
          <input
            type="text"
            name="OwnerId"
            placeholder="Owner Id"
            value={formData.OwnerId}
            onChange={handleChange}
          />
        </div>

        <br />

        <button type="submit">
          Create Contact
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