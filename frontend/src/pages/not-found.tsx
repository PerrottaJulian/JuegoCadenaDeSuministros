import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-6rem)] w-full flex items-center justify-center dark">
      <Card className="w-full max-w-md mx-4 bg-card">
        <CardContent className="pt-6 flex flex-col items-center text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">404 Página No Encontrada</h1>
          <p className="text-sm text-muted-foreground mb-6">
            ¿Olvidaste agregar la página al enrutador?
          </p>
          <Link href="/">
            <Button variant="default">Volver al Centro de Operaciones</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
