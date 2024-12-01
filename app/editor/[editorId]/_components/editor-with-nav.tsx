"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Navbar } from "./navbar";
import { CollaborativeEditor } from "./CollaborativeEditor";

interface EditorWithNavProps {
  documentId: string;
}

export const EditorWithNav: React.FC<EditorWithNavProps> = ({ documentId }) => {
  const document = useQuery(api.codeDocument.get, { 
    id: documentId as Id<"codeDocuments"> 
  });

  if (!document) return null;

  return (
    <div className="h-full w-full flex flex-col">
      <Navbar documentId={documentId} />
      <CollaborativeEditor 
        documentId={documentId}
        defaultValue={document.content}
       // defaultLanguage={document.language}
      />
    </div>
  );
};