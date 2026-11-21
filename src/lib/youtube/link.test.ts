import { describe, expect, it } from "vitest";

import { idDoYoutube } from "./link";

describe("idDoYoutube", () => {
  it.each([
    ["https://www.youtube.com/watch?v=ab12Cd34Ef5", "ab12Cd34Ef5"],
    ["https://youtube.com/watch?v=ab12Cd34Ef5&t=42s", "ab12Cd34Ef5"],
    ["https://m.youtube.com/watch?v=ab12Cd34Ef5", "ab12Cd34Ef5"],
    ["https://youtu.be/ab12Cd34Ef5", "ab12Cd34Ef5"],
    ["https://youtu.be/ab12Cd34Ef5?si=xyz", "ab12Cd34Ef5"],
    ["youtu.be/ab12Cd34Ef5", "ab12Cd34Ef5"],
    ["https://www.youtube.com/shorts/ab12Cd34Ef5", "ab12Cd34Ef5"],
    ["https://www.youtube.com/live/ab12Cd34Ef5?feature=share", "ab12Cd34Ef5"],
    ["https://www.youtube.com/embed/ab12Cd34Ef5", "ab12Cd34Ef5"],
    ["https://www.youtube-nocookie.com/embed/ab12Cd34Ef5", "ab12Cd34Ef5"],
    ["  https://youtu.be/a-b_c-d_e-f  ", "a-b_c-d_e-f"],
  ])("aceita %s", (link, id) => {
    expect(idDoYoutube(link)).toBe(id);
  });

  it.each([
    "",
    "não é link",
    "https://vimeo.com/123456789",
    "https://www.youtube.com/@sintravc",
    "https://www.youtube.com/watch?v=curto",
    "https://www.youtube.com/watch?v=ab12Cd34Ef5x",
    "https://youtu.be/",
    "https://youtube.com.golpe.com/watch?v=ab12Cd34Ef5",
    "ftp://youtu.be/ab12Cd34Ef5",
    "javascript:alert(1)",
  ])("recusa %s", (link) => {
    expect(idDoYoutube(link)).toBeNull();
  });
});
