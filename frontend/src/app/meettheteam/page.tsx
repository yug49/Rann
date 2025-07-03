import Image from 'next/image';
import { FaGithub, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import '../home-glass.css';

const teamMembers = [
	{
		name: 'Samkit Soni',
		photo: '/Samkit_soni.jpg',
		linkedin: 'https://www.linkedin.com/in/samkit-soni-bab741250/',
		twitter: 'https://x.com/Samkit_Soni12',
		github: 'https://github.com/SamkitSoni',
		email: 'samkitsoni09@gmail.com',
	},
	{
		name: 'Yug Agarwal',
		photo: '/Yug.jpg',
		linkedin: 'https://www.linkedin.com/in/yug-agarwal-8b761b255/',
		twitter: 'https://x.com/yugAgarwal29',
		github: 'https://github.com/yug49',
		email: 'pyth0n0729@gmail.com',
	},
	{
		name: 'Kaushtubh Agrawal',
		photo: '/Kaushtubh_sir.jpg',
		linkedin: 'https://www.linkedin.com/in/kaushtubh-agrawal-650b40229/',
		twitter: 'https://x.com/KaushtubhAgraw1',
		github: 'https://github.com/kaustubh76',
		email: 'kaushtubh.agrawal@example.com',
	},
];

export default function MeetTheTeam() {
	return (
		<div className="min-h-screen relative overflow-hidden">
			{/* Background Image */}
			<div className="fixed inset-0 -z-10">
				<Image
					src="/mtt.png"
					alt="Meet The Team Background"
					fill
					className="object-cover"
					priority
				/>
				{/* Very subtle black overlay to darken background */}
				<div 
					className="absolute inset-0"
					style={{
						backgroundColor: 'rgba(0, 0, 0, 0.175)',
						zIndex: 1
					}}
				></div>
			</div>
			
			{/* Epic Background Elements */}
			<div className="absolute inset-0 pointer-events-none">
				{/* Geometric Battle Lines */}
				<div className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-600 to-transparent opacity-30"></div>
				<div className="absolute bottom-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-30"></div>
			</div>

			{/* Main Content */}
			<div className="relative z-10 container mx-auto px-6 py-12">
				{/* Page Header */}
				<div className="text-center mb-12">
					<h1 
						className="text-4xl md:text-6xl text-orange-400 mb-6 tracking-widest arcade-glow"
						style={{
							fontFamily: 'Press Start 2P, monospace'
						}}
					>
						MEET THE TEAM
					</h1>
					
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-8xl mx-auto">
					{teamMembers.map((member) => (
						<div 
							key={member.name} 
							className="arcade-card p-8 group flex flex-col items-center transform hover:scale-105 transition-all duration-300"
							style={{
								background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
								border: '3px solid #ff8c00',
								borderRadius: '24px',
								backdropFilter: 'blur(20px)',
								WebkitBackdropFilter: 'blur(20px)',
								boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
							}}
						>
							<div className="mb-6">
								<div className="w-80 h-80 mx-auto rounded-2xl flex items-center justify-center relative overflow-hidden border-2 border-orange-600">
									<Image src={member.photo} alt={member.name} width={320} height={320} className="w-full h-full rounded-2xl object-cover" />
									<div className="absolute inset-0 rounded-2xl border-2 border-orange-600 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
								</div>
							</div>
							<h2 
								className="text-xl text-orange-400 mb-4 tracking-wider arcade-glow text-center"
								style={{ fontFamily: 'Press Start 2P, monospace' }}
							>
								{member.name}
							</h2>
							<div className="border-t-2 border-orange-600 pt-4 mb-4 w-full text-center"></div>
							<div className="flex justify-center gap-4 mt-auto text-orange-400 text-2xl">
								<a href={member.linkedin} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="hover:text-blue-600 transition-colors">
									<FaLinkedin />
								</a>
								<a href={member.twitter} target="_blank" rel="noopener noreferrer" title="X (Twitter)" className="hover:text-black transition-colors">
									<FaXTwitter />
								</a>
								<a href={member.github} target="_blank" rel="noopener noreferrer" title="GitHub" className="hover:text-black transition-colors">
									<FaGithub />
								</a>
								<a href={`mailto:${member.email}`} title="Email" className="hover:text-red-600 transition-colors">
									<FaEnvelope />
								</a>
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
