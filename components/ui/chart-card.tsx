import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function ChartCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader title={title} description={description} />
      <CardBody className="pt-0">{children}</CardBody>
    </Card>
  );
}
