import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) {
  const envFile = readFileSync(".env.local", "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    process.env[key] ??= valueParts.join("=").replace(/^["']|["']$/g, "");
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = {
  login: "Gabriel Martins",
  email: "gabriel.martins@cs-inteligente.local",
  password: "195430"
};

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

if (listError) {
  console.error(listError.message);
  process.exit(1);
}

const existingUser = usersData.users.find((user) => user.email === admin.email);

if (existingUser) {
  const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password: admin.password,
    email_confirm: true,
    user_metadata: { name: admin.login, role: "admin" }
  });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`ADM atualizado: ${admin.login}`);
  process.exit(0);
}

const { error } = await supabase.auth.admin.createUser({
  email: admin.email,
  password: admin.password,
  email_confirm: true,
  user_metadata: { name: admin.login, role: "admin" }
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`ADM criado: ${admin.login}`);
