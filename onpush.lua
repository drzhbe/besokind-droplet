-- handle git push and restart server

function os.capture(cmd, raw)
  local f = assert(io.popen(cmd, 'r'))
  local s = assert(f:read('*a'))
  f:close()
  if raw then return s end
  s = string.gsub(s, '^%s+', '')
  s = string.gsub(s, '%s+$', '')
  s = string.gsub(s, '[\n\r]+', ' ')
  return s
end


function dump(o)
   if type(o) == 'table' then
      local s = '{ '
      for k,v in pairs(o) do
         if type(k) ~= 'number' then k = '"'..k..'"' end
         s = s .. '['..k..'] = ' .. dump(v) .. ','
      end
      return s .. '} '
   else
      return tostring(o)
   end
end


function starts(str,start)
   return string.sub(str,1,string.len(start))==start
end


function has_value (tab, val)
    for index, value in ipairs(tab) do
        if value == val then
            return true
        end
    end

    return false
end

----------
if ngx then
	local ip = ngx.var.remote_addr
	local white_ips = {'34.198.203.127', '34.198.178.64', '34.198.32.85'}
	ngx.log(ngx.STDERR, 'before')
	ngx.log(ngx.STDERR, ip)
	if starts(ip, '104.192.143')
		or has_value(white_ips, ip) then

		ngx.log(ngx.STDERR, 'inside')
		local pull_result = os.capture('git -C /home/besokind/besokind-droplet pull origin master', true)
		ngx.log(ngx.STDERR, pull_result)
	end
	ngx.log(ngx.STDERR, 'after')
	ngx.header.content_type = 'text/plain'
	ngx.say("ok")
end


print('no ngx')
