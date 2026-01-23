async function checkBan(studentId) {
  const { data } = await supabase
    .from("students")
    .select("is_banned")
    .eq("id", studentId)
    .single();

  if (data.is_banned) {
    alert("تم حظر حسابك من الإدارة");
    await supabase.auth.signOut();
    window.location.href = "../login.html";
  }
}