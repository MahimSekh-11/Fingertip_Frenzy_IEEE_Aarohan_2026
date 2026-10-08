import React, { useState } from "react";
import { Card, Field, Button, Notice } from "./ui";
import { request } from "../services/api";
export function PuzzleUpload({ onSave }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Card id="puzzle-upload">
      <h2>Build a puzzle from an image</h2>
      <p>
        Upload PNG, JPEG or WebP up to 1 MB. The server crops every tile and
        stores the original order privately.
      </p>
      <Notice error>{error}</Notice>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget),
            file = f.get("image");
          setBusy(true);
          setError("");
          try {
            if (!file.size || file.size > 1000000)
              throw new Error("Choose an image smaller than 1 MB.");
            const image = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            await request("/admin/games/puzzle/upload", {
              method: "POST",
              body: {
                image,
                title: f.get("title"),
                gridRows: Number(f.get("rows")),
                gridCols: Number(f.get("cols")),
                points: Number(f.get("points")),
              },
            });
            onSave();
          } catch (e) {
            setError(e.message || "Image processing failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label="Puzzle title"
          name="title"
          minLength={2}
          maxLength={100}
          required
        />
        <Field
          label="Source image"
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
        />
        <div className="two-columns">
          <Field
            label="Rows"
            name="rows"
            type="number"
            min={2}
            max={8}
            defaultValue={3}
            required
          />
          <Field
            label="Columns"
            name="cols"
            type="number"
            min={2}
            max={8}
            defaultValue={3}
            required
          />
        </div>
        <Field
          label="Points"
          name="points"
          type="number"
          min={0}
          max={10000}
          defaultValue={100}
          required
        />
        <Button busy={busy}>Process image and save draft</Button>
      </form>
    </Card>
  );
}
