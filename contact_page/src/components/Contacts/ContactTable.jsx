export default function ContactTable({ contacts }) {
  return (
    <table border="1" cellPadding="8" width="100%">
      <thead>
        <tr>
          <th>Id</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Email</th>
        </tr>
      </thead>

      <tbody>
        {contacts.map((contact) => (
          <tr key={contact.Id}>
            <td>{contact.Id}</td>
            <td>{contact.FirstName}</td>
            <td>{contact.LastName}</td>
            <td>{contact.Email}</td>
          </tr>
        ))}

        {contacts.length === 0 && (
          <tr>
            <td colSpan="4">
              No Contacts Found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}