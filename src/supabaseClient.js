const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const addToDb = async (user, word) => {
  const { data, error } = await supabase.from("words").insert([
    {
      user,
      word,
    },
  ]);
};

module.exports = {
  addToDb,
};
