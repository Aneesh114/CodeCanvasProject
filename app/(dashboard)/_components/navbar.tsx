"use client";

import { OrganizationSwitcher, UserButton, useOrganization } from "@clerk/nextjs";
import { SearchInput } from "./search-input";
import { InviteButton } from "./invite-button";
import { Hint } from "@/components/hint";
import { Button } from "@/components/ui/button";
import { Pen } from "lucide-react";
import { useRouter } from "next/navigation"; // For navigation
import { useApiMutation } from "@/hooks/use-api-mutation"; // For API call to create room
import { api } from "@/convex/_generated/api"; // Your API endpoint for room creation
import { toast } from "sonner"; // For notifications

export const Navbar = () => {
    const { organization } = useOrganization();
    const router = useRouter();
    const { mutate, pending } = useApiMutation(api.board.create); // Adjust this to your actual API for room creation
    console.log(mutate)
    const onJoinRoomClickText = () => {
        const roomId = "j57bfp99v64qj8n95sv3t7t9x1737w0c"; // Predefined room ID
        toast.success("Joining room");
        router.push(`/text-editor/${roomId}`); // Redirect to the secure room with roomId
    };
    /*const onJoinRoomClickCode = () => {
        const roomId = "j57bcxz2w9v55dvvqnpva44xb973cd6v"; // Predefined room ID
        toast.success("Joining room");
        router.push(`/code-editor/${roomId}`); // Redirect to the secure room with roomId
    };
    const onCreateRoomClick = () => {
        if (!organization) {
            toast.error("Organization not found");
            return;
        }

        // Create the room and get the roomId
        mutate({
            orgId: organization.id, // Pass organization ID
            title: "Untitled Room", // Optional title for room
        })
        .then((roomId) => {
            toast.success("Room created");
            router.push(`/text-editor/${roomId}`); // Redirect to the secure room with roomId
        })
        .catch(() => {
            toast.error("Failed to create room");
        });
    };*/

    return (
        <div className="flex items-center gap-x-4 p-5">
            {/* Search Bar for larger screens */}
            <div className="hidden lg:flex lg:flex-1">
                <SearchInput />
            </div>

           
            
            {/* Invite Button */}
            {organization && <InviteButton />}

            {/* User Button */}
            <UserButton />

            {/* For smaller screens, display OrganizationSwitcher and Text Editor button */}
            <div className="block lg:hidden flex-1">
                <OrganizationSwitcher
                    hidePersonal
                    appearance={{
                        elements: {
                            rootBox: {
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                                maxWidth: "376px",
                            },
                            organizationSwitcherTrigger: {
                                padding: "6px",
                                width: "100%",
                                borderRadius: "8px",
                                border: "1px solid #E5E7EB",
                                justifyContent: "space-between",
                                backgroundColor: "white",
                            },
                        },
                    }}
                />
                
                
            </div>
        </div>
    );
};
