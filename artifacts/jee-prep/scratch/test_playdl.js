import * as playdl from "play-dl";

async function test() {
  try {
    const channelUrl = "https://www.youtube.com/@tseries";
    console.log("Fetching channel info for:", channelUrl);
    const channelInfo = await playdl.channel_info(channelUrl);
    console.log("Channel info keys:", Object.keys(channelInfo));
    console.log("Channel ID:", channelInfo.id);
    console.log("Channel Name:", channelInfo.name);
    
    // Check if channelInfo has videos or a videos feed or if we can get uploads
    const uploadsPlaylistId = "UU" + channelInfo.id.substring(2);
    console.log("Uploads playlist ID:", uploadsPlaylistId);
    
    try {
      const playlist = await playdl.playlist_info(`https://www.youtube.com/playlist?list=${uploadsPlaylistId}`, { incomplete: true });
      console.log("Playlist found! Video count:", playlist.videoCount);
      // Wait, let's list page 1 videos
      const videos = playlist.videos;
      console.log("Videos count on page 1:", videos.length);
      console.log("First video:", {
        id: videos[0].id,
        title: videos[0].title,
        views: videos[0].views,
        duration: videos[0].durationInSec,
        uploadedAt: videos[0].uploadedAt
      });
    } catch(err) {
      console.log("Playlist fetch failed:", err.message);
    }
  } catch(err) {
    console.error("Test failed:", err);
  }
}

test();
