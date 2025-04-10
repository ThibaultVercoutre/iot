import { Button } from "@/components/ui/button";
import { Shield, Trash } from "lucide-react";
import { useState } from "react";

export default function AccountSecurity() {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleChangePassword = () => {
        // À implémenter: ouverture d'une modal de changement de mot de passe
        console.log("Changement de mot de passe demandé");
    };

    const handleDeleteAccount = () => {
        // À implémenter: logique de suppression de compte
        console.log("Suppression de compte confirmée");
    };

    const handleDeleteAccountClick = () => {
        setIsDeleting(true);
    };

    const handleCancelDelete = () => {
        setIsDeleting(false);
    };

    return (
        <div>
            <h3 className="text-lg font-medium mb-2">Sécurité du compte</h3>
            <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 mb-2"
                onClick={handleChangePassword}
            >
                <Shield className="h-4 w-4" />
                Changer mon mot de passe
            </Button>

            {!isDeleting ? (
                <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleDeleteAccountClick}
                >
                <Trash className="h-4 w-4 mr-2" />
                Supprimer mon compte
                </Button>
            ) : (
                <div className="space-y-2 mt-2">
                    <p className="text-sm text-destructive font-medium">Êtes-vous sûr de vouloir supprimer votre compte ?</p>
                    <div className="flex space-x-2">
                        <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={handleDeleteAccount}
                        >
                        Confirmer
                        </Button>
                        <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleCancelDelete}
                        >
                        Annuler
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
