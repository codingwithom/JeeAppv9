async function test() {
  try {
    const videoId = "VdScGKEqFE4";
    const url = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
    console.log("Fetching noembed:", url);
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      console.log("Noembed result:", data);
    } else {
      console.log("Failed to fetch noembed:", res.status);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
