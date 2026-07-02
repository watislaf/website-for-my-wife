output "server_ip" {
  description = "Public IPv4 address of the personal-site server."
  value       = hcloud_server.app.ipv4_address
}
