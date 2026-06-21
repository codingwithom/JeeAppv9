async function test() {
  try {
    const videoId = "VdScGKEqFE4";
    const mirrors = [
      "https://inv.thepixora.com",
      "https://invidious.f5.si",
      "https://invidious.tiekoetter.com"
    ];
    for (const mirror of mirrors) {
      const url = `${mirror}/api/v1/captions/${videoId}`;
      console.log("Fetching Invidious captions from:", url);
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          console.log("Captions data keys:", Object.keys(data));
          if (data.captions && data.captions.length > 0) {
            console.log("Found captions:", data.captions.length);
            console.log("First caption entry:", data.captions[0]);
            
            // Let's try to fetch the actual subtitle data
            const subUrl = `${mirror}${data.captions[0].url}`;
            console.log("Fetching subtitle data from:", subUrl);
            const subRes = await fetch(subUrl);
            if (subRes.ok) {
              const subText = await subRes.text();
              console.log("Subtitles text sample:", subText.slice(0, 300));
              break;
            }
          }
        }
      } catch (err) {
        console.warn("Failed from mirror:", mirror, err.message);
      }
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
