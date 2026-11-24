export default function ContactTable({ contacts }) {
  return (
    <table border="1" cellPadding="10">
      <thead>
        <tr>
          <th>Id</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Title</th>
          <th>Account Id</th>
          <th>Owner Id</th>
        </tr>
      </thead>

      <tbody>
        {contacts.map((contact) => (
          <tr key={contact.Id}>
            <td>{contact.Id}</td>
            <td>{contact.FirstName}</td>
            <td>{contact.LastName}</td>
            <td>{contact.Email}</td>
            <td>{contact.Phone || "-"}</td>
            <td>{contact.Title || "-"}</td>
            <td>{contact.AccountId || "-"}</td>
            <td>{contact.OwnerId || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}