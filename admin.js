async function loadStudents() {
  const { data } = await supabase.from("students").select("*");

  let table = document.getElementById("studentsTable");
  table.innerHTML = `
    <tr>
      <th>الاسم</th>
      <th>ID</th>
      <th>السنة</th>
      <th>حالة</th>
      <th>تحكم</th>
    </tr>
  `;

  data.forEach(s => {
    table.innerHTML += `
      <tr>
        <td>${s.first_name} ${s.last_name}</td>
        <td>${s.student_code}</td>
        <td>${s.academic_year}</td>
        <td>${s.is_banned ? "محظور" : "نشط"}</td>
        <td>
          <button onclick="toggleBan('${s.id}', ${s.is_banned})">
            ${s.is_banned ? "فك الحظر" : "حظر"}
          </button>
        </td>
      </tr>
    `;
  });
}

async function toggleBan(id, state) {
  await supabase
    .from("students")
    .update({ is_banned: !state })
    .eq("id", id);

  loadStudents();
}